/**
 * dsh-keepalive host half: wire the settings namespace, the storage domain,
 * the scheduling engine, and the HTTP face together. Silent by design — no
 * sessions, no session events, no system-prompt presence (AGENTS red line).
 *
 * @module dsh-keepalive
 */
import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/cordis-plugin-timer'
import type {} from '@deepseek-ai/dsh-host-webserver'
import * as DshSettings from '@deepseek-ai/dsh-settings'
import type { SettingsNamespace, SettingsScope } from '@deepseek-ai/dsh-settings'
import { Config } from './config.ts'
import { createEngine } from './engine.ts'
import type { Engine } from './engine.ts'
import { createKeeper } from './keeper.ts'
import type { ShotResult } from './keeper.ts'
import { ROUTE_PREFIX, createRoutes } from './routes.ts'
import { appendHistory, pruneDailyStats, recordDailyShot } from './history.ts'
import { keepaliveDomain } from './domain.ts'
import type { DailyStat, HistoryEntry, KeepaliveConfig } from './types.ts'

export const name = 'dsh-keepalive'

/** Host services required before activation (fail-loud when missing). */
export const inject = ['llm', 'settings', 'storageDomain', 'webServer', 'timer']

export { Config }

/** History ring cap (spec: keep the most recent 500 shots). */
const HISTORY_LIMIT = 500
/** Daily stat horizon in days (spec: 90). */
const STATS_KEEP_DAYS = 90

/**
 * V1/V2 dual-compat namespace: V1 (0.1.1-rc.2) exports the settingsNamespace
 * factory; V2 (0.1.2-alpha.2+) removed it and register() takes the raw string.
 * The optional-property probe compiles on BOTH generations' type sets (V2's
 * SettingsNamespaceInput admits the branded type; V1's APIs require it), with
 * the casts confined to this one seam.
 */
const nsFactory = (DshSettings as { settingsNamespace?: (value: string) => SettingsNamespace }).settingsNamespace
const NAMESPACE: SettingsNamespace = nsFactory !== undefined
  ? nsFactory('dsh-keepalive')
  : ('dsh-keepalive' as SettingsNamespace)

/**
 * The profile entry id this plugin is inserted under (cordis.patch.yml).
 * Hosts from 0.1.7 address writable plugin config by this entry id.
 */
const ENTRY_ID = 'dsh-keepalive'

/** Host-facing config access, uniform across settings generations. */
interface SettingsPort {
  get(): KeepaliveConfig
  update(patch: object): Promise<void>
  removeProvider(id: string): Promise<void>
  watch(onChange: () => void): () => void
  /**
   * Entry-model hosts deliver writes as in-place volatile updates whose
   * reschedule signal (loader/volatile-update) only helps once watch is
   * armed, so prefill runs late on that path (spec #6 节 2/节 3).
   */
  readonly prefillAfterWatch: boolean
}

/**
 * Build the settings port for the running host generation. Legacy hosts
 * (0.1.1-rc.2 / 0.1.2-alpha.5) expose register()/SettingsScope; hosts from
 * 0.1.7 expose SettingsForms.update/mutate over profile entries and
 * propagate writes as loader volatile updates that mutate the live config
 * object without remounting this entry. Type truth stays the oldest
 * supported peer; newer-generation casts are confined to this seam.
 */
function buildSettingsPort(ctx: Context, config: Partial<KeepaliveConfig>, legacy: boolean): SettingsPort {
  if (legacy) {
    const scope: SettingsScope<KeepaliveConfig> = ctx.settings.register(NAMESPACE, Config, { base: config })
    return {
      get: () => scope.get(),
      update: (patch) => scope.update(patch),
      removeProvider: (id) => ctx.settings.mutate(NAMESPACE, [{ op: 'unset', path: ['providers', id] }]),
      watch: (onChange) => scope.watch(onChange),
      prefillAfterWatch: false
    }
  }
  const forms = ctx.settings as unknown as {
    update(ns: string, patch: object): Promise<void>
    mutate(ns: string, ops: { op: 'unset', path: string[] }[]): Promise<void>
  }
  // Entry-model hosts hand apply() a cosmokit volatile reference: with a
  // root-volatile Config the whole config arrives as ONE root ref
  // ({ get(): snapshot }) whose snapshot the owning runtime swaps on writes
  // (verified on 0.1.7-rc.1; cf. agent-loop reading field refs via .get()).
  // Read through the ref each call, then normalize field-by-field so schema
  // defaults apply for absent keys (defaults mirror src/config.ts).
  const live = config as unknown
  const isRef = (value: unknown): value is { get(): unknown } =>
    typeof value === 'object' && value !== null && 'get' in value
  const readRaw = (): Partial<KeepaliveConfig> => {
    const raw = isRef(live) ? live.get() : live
    return (raw ?? {}) as Partial<KeepaliveConfig>
  }
  const readLive = (): KeepaliveConfig => {
    const raw = readRaw()
    return {
      enabled: raw.enabled ?? false,
      intervalMinutes: raw.intervalMinutes ?? 30,
      jitterPercent: raw.jitterPercent ?? 20,
      autoPause: {
        enabled: raw.autoPause?.enabled ?? true,
        threshold: raw.autoPause?.threshold ?? 5
      },
      providers: raw.providers ?? {}
    }
  }
  return {
    get: () => readLive(),
    update: (patch) => forms.update(ENTRY_ID, patch),
    removeProvider: (id) => forms.mutate(ENTRY_ID, [{ op: 'unset', path: ['providers', id] }]),
    watch: (onChange) => ctx.on('loader/volatile-update' as never, onChange as never) as unknown as () => void,
    prefillAfterWatch: true
  }
}

function localDay(at: number): string {
  const date = new Date(at)
  const pad = (value: number): string => String(value).padStart(2, '0')
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate())
}

interface OpenedDomain {
  global: { get(): { nextFireAt: Record<string, number> }; set(value: { nextFireAt: Record<string, number> }): Promise<void> }
  table(name: 'history'): {
    put(key: string, value: HistoryEntry): Promise<void>
    get(key: string): HistoryEntry | undefined
    entries(): IterableIterator<[string, HistoryEntry]>
    delete(key: string): Promise<boolean>
    readonly size: number
  }
  table(name: 'stats'): {
    put(key: string, value: DailyStat): Promise<void>
    get(key: string): DailyStat | undefined
    entries(): IterableIterator<[string, DailyStat]>
    update(key: string, fn: (current: DailyStat) => DailyStat): Promise<DailyStat>
  }
  close(): Promise<void> | void
}

/** Sequential history key counter keeps ring keys unique per process. */
let historySeq = 0

/**
 * Install dsh-keepalive. The composition-layer entry config flows in as the
 * settings namespace base layer (below user settings): dev overlays seed
 * defaults, the user document stays the live-adjustable truth. Async init
 * runs as a guarded background task so the plugin activates synchronously;
 * failures log loudly instead of throwing into the fiber.
 */
export function apply(ctx: Context, config: Partial<KeepaliveConfig> = {}): void {
  const logger = {
    info: (message: string): void => ctx.logger.info(message),
    warn: (message: string): void => ctx.logger.warn(message)
  }

  const init = async (): Promise<void> => {
    const legacyRegister = (ctx.settings as { register?: unknown }).register
    const port = buildSettingsPort(ctx, config, typeof legacyRegister === 'function')

    // First run: prefill the provider map with every registered route so the
    // user only flips the master switch (master stays OFF until confirmed).
    // Legacy scope reads are immediate; the entry model propagates the write
    // as a volatile update, so prefill there runs after watch is armed.
    const prefill = async (): Promise<void> => {
      if (Object.keys(port.get().providers ?? {}).length > 0) return
      const routes = ctx.llm.listProviders()
      const providers: Record<string, { enabled: boolean }> = {}
      for (const route of routes) providers[route.id] = { enabled: true }
      if (Object.keys(providers).length === 0) return
      // Non-fatal: an overlay/home-patch override of this entry refuses
      // persistent writes ("overridden by a home patch or command-line
      // overlay"); the panel's opt-in flow covers that case instead.
      try {
        await port.update({ providers })
      } catch (error) {
        logger.warn('dsh-keepalive: provider prefill skipped: ' + String(error))
      }
    }
    if (!port.prefillAfterWatch) await prefill()

    const domain = (await ctx.storageDomain.open(keepaliveDomain)) as unknown as OpenedDomain
    ctx.effect(() => () => void Promise.resolve(domain.close()).catch(() => undefined))

    const historyTable = domain.table('history')
    const statsTable = domain.table('stats')

    const onShot = (provider: string, model: string, result: ShotResult, at: number): void => {
      const entry: HistoryEntry = {
        provider,
        model,
        status: result.status,
        latencyMs: result.latencyMs,
        content: result.content,
        reply: result.reply,
        preview: result.preview,
        at,
        ...(result.error === undefined ? {} : { error: result.error })
      }
      historySeq += 1
      const key = String(at) + '-' + String(historySeq)
      void historyTable.put(key, entry)
        .then(() => {
          // Ring prune: drop oldest beyond the cap.
          if (historyTable.size > HISTORY_LIMIT) {
            const all = [...historyTable.entries()].sort((a, b) => a[1].at - b[1].at)
            const excess = historyTable.size - HISTORY_LIMIT
            for (let index = 0; index < excess; index += 1) {
              const oldest = all[index]
              if (oldest === undefined) break
              void historyTable.delete(oldest[0])
            }
          }
        })
        .catch((error: unknown) => logger.warn('dsh-keepalive: history persist failed: ' + String(error)))
      const day = localDay(at)
      void recordDailyShot(statsTable, day, entry.status, entry.latencyMs)
        .catch((error: unknown) => logger.warn('dsh-keepalive: stats persist failed: ' + String(error)))
    }

    const persistNextFire = (map: Record<string, number>): void => {
      void domain.global.set({ nextFireAt: map }).catch((error: unknown) =>
        logger.warn('dsh-keepalive: nextFire persist failed: ' + String(error))
      )
    }

    const resolveModel = async (provider: string): Promise<string | null> => {
      const configured = port.get().providers[provider]?.model
      if (typeof configured === 'string' && configured.length > 0) return configured
      const models = await ctx.llm.listModels(provider)
      return models[0]?.id ?? null
    }

    const keeper = createKeeper((options) => ctx.llm.stream(options), Math.random, Date.now)
    const engine: Engine = createEngine({
      scheduler: { timeout: (callback, delay) => ctx.timeout(callback, delay) },
      keeper,
      resolveModel,
      config: () => port.get(),
      onShot,
      persistNextFire,
      loadNextFire: () => domain.global.get().nextFireAt ?? null,
      logger,
      now: Date.now,
      rand: Math.random
    })

    await engine.start()

    const routes = createRoutes({
      engine,
      config: () => port.get(),
      // Recursive-merge settings cannot delete keys via update; removal is a
      // path-addressed unset on the user layer through the provider's mutate.
      updateConfig: (patch) => port.update(patch),
      removeProvider: (id) => port.removeProvider(id),
      listAvailableProviders: () => ctx.llm.listProviders().map((route) => ({ id: route.id, name: route.name })),
      listModels: async (id) => (await ctx.llm.listModels(id)).map((model) => model.id),
      history: (limit, provider) => {
        let items = [...historyTable.entries()]
          .map(([, entry]) => entry)
          .sort((a, b) => b.at - a.at)
        if (provider !== undefined) items = items.filter((entry) => entry.provider === provider)
        return items.slice(0, limit)
      },
      dailyStats: () => {
        const today = localDay(Date.now())
        const pruned = pruneDailyStats(Object.fromEntries(statsTable.entries()), today, STATS_KEEP_DAYS)
        for (const day of Object.keys(pruned)) void statsTable.put(day, pruned[day]!)
        return pruned
      },
      logger,
      now: Date.now
    })

    ctx.effect(
      () =>
        ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/status', handler: routes.status }),
      'dsh-keepalive: status route'
    )
    ctx.effect(
      () =>
        ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/history', handler: routes.history }),
      'dsh-keepalive: history route'
    )
    ctx.effect(
      () =>
        ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/config', handler: routes.config }),
      'dsh-keepalive: config route'
    )
    ctx.effect(
      () =>
        ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/action', handler: routes.action }),
      'dsh-keepalive: action route'
    )
    ctx.effect(
      () =>
        ctx.webServer.register({ kind: 'exact', path: ROUTE_PREFIX + '/models', handler: routes.models }),
      'dsh-keepalive: models route'
    )

    const disposeWatch = port.watch(() => {
      void engine.reschedule().catch((error: unknown) => logger.warn('dsh-keepalive: reschedule failed: ' + String(error)))
    })
    ctx.effect(() => disposeWatch, 'dsh-keepalive: settings watch')
    if (port.prefillAfterWatch) await prefill()

    ctx.effect(() => () => engine.dispose(), 'dsh-keepalive: engine dispose')
    logger.info('dsh-keepalive: host half active')
  }

  void init().catch((error: unknown) => {
    ctx.logger.error('dsh-keepalive: initialization failed: ' + String(error))
  })
}
