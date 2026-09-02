/**
 * Client-side state: one polling store over the host HTTP face. The store
 * owns ALL client state (single source); components read snapshots only.
 * Countdowns are computed from nextFireAt + serverNow skew locally. Every
 * mutating call reports back through a pending key (button state) and a
 * flash banner (result feedback).
 */
import type { DailyStat, HistoryEntry, KeepaliveConfig, StatusSnapshot } from '../types.ts'

export interface HistoryResponse {
  items: HistoryEntry[]
  dailyStats: Record<string, DailyStat>
}

/** Per-provider model id lists (GET /models body). */
export interface ModelsResponse {
  models: Record<string, string[]>
}

/** One transient result banner shown after a mutating action settles. */
export interface FlashMessage {
  seq: number
  kind: 'ok' | 'err'
  text: string
}

/** Optional per-call feedback metadata supplied by the calling button. */
export interface ActionMeta {
  /** Pending key; distinct per button so concurrent actions stay honest. */
  key?: string
  /** Banner text on success; failures always banner kind 'err'. */
  ok?: string
}

export interface KeepaliveUiState {
  status: StatusSnapshot | null
  history: HistoryResponse | null
  /** Local clock minus server clock at last poll; applied to countdowns. */
  skewMs: number
  error: string | null
  /** Per-provider model lists; null until first fetched. */
  models: Record<string, string[]> | null
  /** Last settled action banner; the view unmounts it via clearFlash. */
  flash: FlashMessage | null
  /** In-flight action keys (button spinners/disable states). */
  pending: Record<string, true>
}

export type StoreListener = (state: KeepaliveUiState) => void

export const POLL_INTERVAL_MS = 5_000

/** Read-only face of the fetch used by the store (injectable in tests). */
export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export function createInitialUiState(): KeepaliveUiState {
  return { status: null, history: null, skewMs: 0, error: null, models: null, flash: null, pending: {} }
}

/** Milliseconds until the provider's next shot, corrected by server skew. */
export function countdownMs(nextFireAt: number | null, state: KeepaliveUiState, nowMs: number): number | null {
  if (nextFireAt === null) return null
  const adjusted = nextFireAt - state.skewMs
  return Math.max(0, adjusted - nowMs)
}

/** mm:ss / h:mm:ss formatting for countdown labels. */
export function formatCountdown(ms: number | null): string {
  if (ms === null) return '--:--'
  const totalSeconds = Math.floor(ms / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const pad = (value: number): string => String(value).padStart(2, '0')
  return hours > 0 ? String(hours) + ':' + pad(minutes) + ':' + pad(seconds) : pad(minutes) + ':' + pad(seconds)
}

export interface KeepaliveStore {
  getSnapshot(): KeepaliveUiState
  subscribe(listener: StoreListener): () => void
  start(): void
  stop(): void
  refresh(): Promise<void>
  updateConfig(patch: Partial<KeepaliveConfig>, meta?: ActionMeta): Promise<void>
  act(type: 'pause' | 'resume' | 'fire-now' | 'resume-provider' | 'remove-provider', provider?: string, meta?: ActionMeta): Promise<void>
  loadHistory(limit: number): Promise<void>
  loadModels(): Promise<void>
  clearFlash(seq: number): void
}

/** Monotonic banner sequence; keyed Toast remounts on every show. */
let flashSeq = 0

export function createStore(fetchLike: FetchLike, now: () => number, pollMs: number = POLL_INTERVAL_MS): KeepaliveStore {
  let state = createInitialUiState()
  const listeners = new Set<StoreListener>()
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let inFlightPoll = false

  function set(next: Partial<KeepaliveUiState>): void {
    state = { ...state, ...next }
    for (const listener of listeners) listener(state)
  }

  /** Flag a pending key; returns its releaser (idempotent per call site). */
  function beginPending(key: string | undefined): (() => void) | undefined {
    if (key === undefined) return undefined
    set({ pending: { ...state.pending, [key]: true } })
    return () => {
      const next = { ...state.pending }
      delete next[key]
      set({ pending: next })
    }
  }

  /** Publish the settled banner for a finished mutating call. */
  function flashFor(meta: ActionMeta | undefined, error: unknown): void {
    if (error === undefined && meta?.ok === undefined && meta?.key === undefined) return
    flashSeq += 1
    if (error === undefined) {
      set({ flash: { seq: flashSeq, kind: 'ok', text: meta?.ok ?? '已完成' } })
      return
    }
    const detail = error instanceof Error ? error.message : String(error)
    set({ flash: { seq: flashSeq, kind: 'err', text: (meta?.ok ?? '操作') + '失败: ' + detail } })
  }

  async function pollStatus(): Promise<void> {
    if (inFlightPoll) return
    inFlightPoll = true
    try {
      const response = await fetchLike('/plugins/dsh-keepalive/status')
      if (!response.ok) throw new Error('status ' + String(response.status))
      const body = (await response.json()) as StatusSnapshot
      set({ status: body, skewMs: now() - body.now, error: null })
    } catch (error) {
      set({ error: error instanceof Error ? error.message : String(error) })
    } finally {
      inFlightPoll = false
    }
  }

  return {
    getSnapshot: () => state,
    subscribe(listener) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    start() {
      if (pollTimer !== null) return
      void pollStatus()
      pollTimer = setInterval(() => void pollStatus(), pollMs)
    },
    stop() {
      if (pollTimer !== null) {
        clearInterval(pollTimer)
        pollTimer = null
      }
    },
    refresh: pollStatus,
    async updateConfig(patch, meta) {
      const release = beginPending(meta?.key)
      try {
        const response = await fetchLike('/plugins/dsh-keepalive/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch)
        })
        if (!response.ok) throw new Error('config ' + String(response.status))
        await pollStatus()
        flashFor(meta, undefined)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) })
        flashFor(meta, error)
      } finally {
        release?.()
      }
    },
    async act(type, provider, meta) {
      const release = beginPending(meta?.key)
      try {
        const response = await fetchLike('/plugins/dsh-keepalive/action', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type, ...(provider === undefined ? {} : { provider }) })
        })
        if (!response.ok) throw new Error('action ' + String(response.status))
        await pollStatus()
        flashFor(meta, undefined)
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) })
        flashFor(meta, error)
      } finally {
        release?.()
      }
    },
    async loadHistory(limit) {
      try {
        const response = await fetchLike('/plugins/dsh-keepalive/history?limit=' + String(limit))
        if (!response.ok) throw new Error('history ' + String(response.status))
        const body = (await response.json()) as HistoryResponse
        set({ history: body, error: null })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) })
      }
    },
    async loadModels() {
      try {
        const response = await fetchLike('/plugins/dsh-keepalive/models')
        if (!response.ok) throw new Error('models ' + String(response.status))
        const body = (await response.json()) as ModelsResponse
        set({ models: body.models, error: null })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) })
      }
    },
    clearFlash(seq) {
      if (state.flash?.seq !== seq) return
      set({ flash: null })
    }
  }
}