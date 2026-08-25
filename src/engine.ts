/**
 * The keepalive scheduling engine: one independent timer chain per provider,
 * jittered from the PREVIOUS shot's completion, with catch-up after restart,
 * auto-park on consecutive failures, and manual pause/resume/fire-now.
 * Pure state machine over injected deps — no ctx, no IO (testable).
 */
import { clampIntervalMinutes, nextDelayMs } from './interval.ts'
import type { Keeper, ShotResult } from './keeper.ts'
import type { KeepaliveConfig, ProviderStatus } from './types.ts'

/** Minimal scheduler face (ctx.timeout satisfies this). */
export interface Scheduler {
  timeout(callback: () => void, delay: number): () => void
}

/** Face of the llm service the engine needs (listModels subset). */
export interface ModelResolver {
  (provider: string): Promise<string | null>
}

export interface EngineDeps {
  scheduler: Scheduler
  keeper: Keeper
  resolveModel: ModelResolver
  config: () => KeepaliveConfig
  /** Persist one shot (history + stats); async, errors handled by caller. */
  onShot: (provider: string, model: string, result: ShotResult, at: number) => void
  /** Persist the nextFireAt map for catch-up; async, errors handled by caller. */
  persistNextFire: (map: Record<string, number>) => void
  /** Load the persisted nextFireAt map (catch-up source); null when absent. */
  loadNextFire: () => Record<string, number> | null
  logger: { info: (message: string) => void; warn: (message: string) => void }
  now: () => number
  rand: () => number
  /** Delay before a catch-up shot after a missed deadline (default 5s). */
  catchUpDelayMs?: number
}

interface ProviderState {
  model: string | null
  nextFireAt: number | null
  parked: boolean
  consecutiveFailures: number
  lastResult: ProviderStatus['lastResult']
  timer: (() => void) | null
  inFlight: boolean
}

/** Grace buffer so a restarted process does not volley all providers at once. */
const DEFAULT_CATCHUP_DELAY_MS = 5_000

export interface Engine {
  start(): Promise<void>
  reschedule(): Promise<void>
  pause(): void
  resume(): void
  fireNow(provider: string): Promise<ShotResult | undefined>
  resumeProvider(provider: string): void
  isPaused(): boolean
  snapshot(): ProviderStatus[]
  dispose(): void
}

/** Create the engine. Everything injectable; see EngineDeps. */
export function createEngine(deps: EngineDeps): Engine {
  const catchUpDelayMs = deps.catchUpDelayMs ?? DEFAULT_CATCHUP_DELAY_MS
  const states = new Map<string, ProviderState>()
  let userPaused = false
  let disposed = false

  function isActive(id: string): boolean {
    const cfg = deps.config()
    if (userPaused || disposed || !cfg.enabled) return false
    return cfg.providers[id]?.enabled === true
  }

  function cancelTimer(id: string): void {
    const state = states.get(id)
    if (state?.timer !== null && state?.timer !== undefined) {
      state.timer()
      state.timer = null
    }
  }

  function publishNextFire(): void {
    const map: Record<string, number> = {}
    for (const [id, state] of states.entries()) {
      if (state.nextFireAt !== null) map[id] = state.nextFireAt
    }
    deps.persistNextFire(map)
  }

  function scheduleNext(id: string): void {
    const state = states.get(id)
    if (state === undefined) return
    cancelTimer(id)
    if (!isActive(id) || state.parked || state.model === null) {
      state.nextFireAt = null
      publishNextFire()
      return
    }
    const cfg = deps.config()
    const baseMs = clampIntervalMinutes(cfg.intervalMinutes) * 60_000
    const delay = nextDelayMs(baseMs, cfg.jitterPercent, deps.rand)
    state.nextFireAt = deps.now() + delay
    state.timer = deps.scheduler.timeout(() => {
      void fire(id)
    }, delay)
    publishNextFire()
  }

  async function fire(id: string): Promise<ShotResult | undefined> {
    const state = states.get(id)
    if (state === undefined || state.inFlight || state.model === null || disposed) return undefined
    state.inFlight = true
    // The timer fired naturally; run its disposer for cleanup hygiene (a
    // no-op on real timers, keeps injected schedulers honest in tests).
    cancelTimer(id)
    try {
      const result = await deps.keeper.shoot(id, state.model)
      const at = deps.now()
      state.lastResult = { status: result.status, at, latencyMs: result.latencyMs }
      deps.onShot(id, state.model, result, at)
      const cfg = deps.config()
      if (result.status === 'ok') {
        state.consecutiveFailures = 0
      } else {
        state.consecutiveFailures += 1
        deps.logger.warn('dsh-keepalive: shot failed for "' + id + '" (' + String(result.error) + '), consecutive=' + String(state.consecutiveFailures))
      }
      const threshold = cfg.autoPause.enabled ? cfg.autoPause.threshold : 0
      if (threshold > 0 && state.consecutiveFailures >= threshold) {
        state.parked = true
        state.nextFireAt = null
        cancelTimer(id)
        publishNextFire()
        deps.logger.warn('dsh-keepalive: provider "' + id + '" parked after ' + String(state.consecutiveFailures) + ' consecutive failures')
        return result
      }
      scheduleNext(id)
      return result
    } finally {
      state.inFlight = false
    }
  }

  async function refreshModels(): Promise<void> {
    const cfg = deps.config()
    const wanted = new Set(Object.keys(cfg.providers).filter((id) => cfg.providers[id]?.enabled === true))
    for (const id of [...states.keys()]) {
      if (!wanted.has(id)) {
        cancelTimer(id)
        states.delete(id)
      }
    }
    for (const id of wanted) {
      if (!states.has(id)) {
        states.set(id, { model: null, nextFireAt: null, parked: false, consecutiveFailures: 0, lastResult: null, timer: null, inFlight: false })
      }
      const state = states.get(id)!
      state.model = await deps.resolveModel(id)
      if (state.model === null) deps.logger.warn('dsh-keepalive: no model resolvable for "' + id + '"; skipping until configured')
    }
  }

  return {
    async start(): Promise<void> {
      await refreshModels()
      const cfg = deps.config()
      const saved = deps.loadNextFire() ?? {}
      for (const id of states.keys()) {
        if (!isActive(id)) continue
        const deadline = saved[id]
        const state = states.get(id)!
        if (deadline === undefined) {
          scheduleNext(id)
        } else if (deadline <= deps.now()) {
          state.nextFireAt = deps.now() + catchUpDelayMs
          state.timer = deps.scheduler.timeout(() => {
            void fire(id)
          }, catchUpDelayMs)
          publishNextFire()
        } else {
          const delay = deadline - deps.now()
          state.nextFireAt = deadline
          state.timer = deps.scheduler.timeout(() => {
            void fire(id)
          }, delay)
          publishNextFire()
        }
      }
      if (!cfg.enabled) deps.logger.info('dsh-keepalive: master switch off; idling')
    },
    async reschedule(): Promise<void> {
      await refreshModels()
      for (const id of states.keys()) {
        scheduleNext(id)
      }
    },
    pause(): void {
      userPaused = true
      for (const id of states.keys()) {
        cancelTimer(id)
        const state = states.get(id)!
        state.nextFireAt = null
      }
      publishNextFire()
    },
    resume(): void {
      userPaused = false
      for (const id of states.keys()) {
        scheduleNext(id)
      }
    },
    async fireNow(id: string): Promise<ShotResult | undefined> {
      const state = states.get(id)
      if (state === undefined) return undefined
      if (userPaused || state.parked) return undefined
      cancelTimer(id)
      return fire(id)
    },
    resumeProvider(id: string): void {
      const state = states.get(id)
      if (state === undefined) return
      state.parked = false
      state.consecutiveFailures = 0
      scheduleNext(id)
    },
    isPaused(): boolean {
      return userPaused
    },
    snapshot(): ProviderStatus[] {
      const cfg = deps.config()
      const rows: ProviderStatus[] = []
      for (const [id, state] of states.entries()) {
        rows.push({
          id,
          model: state.model,
          enabled: cfg.providers[id]?.enabled === true,
          nextFireAt: state.nextFireAt,
          parked: state.parked,
          consecutiveFailures: state.consecutiveFailures,
          lastResult: state.lastResult
        })
      }
      rows.sort((a, b) => a.id.localeCompare(b.id))
      return rows
    },
    dispose(): void {
      disposed = true
      for (const id of states.keys()) {
        cancelTimer(id)
        const state = states.get(id)!
        state.nextFireAt = null
      }
    }
  }
}
