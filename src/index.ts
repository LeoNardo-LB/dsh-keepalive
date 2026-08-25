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
import { settingsNamespace } from '@deepseek-ai/dsh-settings'
import type { SettingsScope } from '@deepseek-ai/dsh-settings'
import { Config } from './config.ts'
import { createEngine } from './engine.ts'
import type { Engine } from './engine.ts'
import { createKeeper } from './keeper.ts'
import type { ShotResult } from './keeper.ts'
import { ROUTE_PREFIX, createRoutes } from './routes.ts'
import { appendHistory, bumpDailyStats, pruneDailyStats } from './history.ts'
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

const NAMESPACE = settingsNamespace('dsh-keepalive')

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
    const scope: SettingsScope<KeepaliveConfig> = ctx.settings.register(NAMESPACE, Config, { base: config })

    // First run: prefill the provider map with every registered route so the
    // user only flips the master switch (master stays OFF until confirmed).
    if (Object.keys(scope.get().providers ?? {}).length === 0) {
      const routes = ctx.llm.listProviders()
      const providers: Record<string, { enabled: boolean }> = {}
      for (const route of routes) providers[route.id] = { enabled: true }
      if (Object.keys(providers).length > 0) await scope.update({ providers })
    }

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
      void statsTable
        .update(day, (current) => bumpDailyStats({ [day]: current }, day, entry.status, entry.latencyMs)[day]!)
        .catch((error: unknown) => logger.warn('dsh-keepalive: stats persist failed: ' + String(error)))
    }

    const persistNextFire = (map: Record<string, number>): void => {
      void domain.global.set({ nextFireAt: map }).catch((error: unknown) =>
        logger.warn('dsh-keepalive: nextFire persist failed: ' + String(error))
      )
    }

    const resolveModel = async (provider: string): Promise<string | null> => {
      const configured = scope.get().providers[provider]?.model
      if (typeof configured === 'string' && configured.length > 0) return configured
      const models = await ctx.llm.listModels(provider)
      return models[0]?.id ?? null
    }

    const keeper = createKeeper((options) => ctx.llm.stream(options), Math.random, Date.now)
    const engine: Engine = createEngine({
      scheduler: { timeout: (callback, delay) => ctx.timeout(callback, delay) },
      keeper,
      resolveModel,
      config: () => scope.get(),
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
      config: () => scope.get(),
      updateConfig: (patch) => scope.update(patch),
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

    const disposeWatch = scope.watch(() => {
      void engine.reschedule().catch((error: unknown) => logger.warn('dsh-keepalive: reschedule failed: ' + String(error)))
    })
    ctx.effect(() => disposeWatch, 'dsh-keepalive: settings watch')

    ctx.effect(() => () => engine.dispose(), 'dsh-keepalive: engine dispose')
    logger.info('dsh-keepalive: host half active')
  }

  void init().catch((error: unknown) => {
    ctx.logger.error('dsh-keepalive: initialization failed: ' + String(error))
  })
}
