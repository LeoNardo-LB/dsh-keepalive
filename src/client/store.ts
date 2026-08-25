/**
 * Client-side state: one polling store over the host HTTP face. The store
 * owns ALL client state (single source); components read snapshots only.
 * Countdowns are computed from nextFireAt + serverNow skew locally.
 */
import type { DailyStat, HistoryEntry, KeepaliveConfig, StatusSnapshot } from '../types.ts'

export interface HistoryResponse {
  items: HistoryEntry[]
  dailyStats: Record<string, DailyStat>
}

export interface KeepaliveUiState {
  status: StatusSnapshot | null
  history: HistoryResponse | null
  /** Local clock minus server clock at last poll; applied to countdowns. */
  skewMs: number
  error: string | null
  /** Panel visibility for the overlay seat. */
  panelOpen: boolean
}

export type StoreListener = (state: KeepaliveUiState) => void

export const POLL_INTERVAL_MS = 5_000

/** Read-only face of the fetch used by the store (injectable in tests). */
export type FetchLike = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>

export function createInitialUiState(): KeepaliveUiState {
  return { status: null, history: null, skewMs: 0, error: null, panelOpen: false }
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
  setPanelOpen(open: boolean): void
  updateConfig(patch: Partial<KeepaliveConfig>): Promise<void>
  act(type: 'pause' | 'resume' | 'fire-now' | 'resume-provider', provider?: string): Promise<void>
  loadHistory(limit: number): Promise<void>
}

export function createStore(fetchLike: FetchLike, now: () => number, pollMs: number = POLL_INTERVAL_MS): KeepaliveStore {
  let state = createInitialUiState()
  const listeners = new Set<StoreListener>()
  let pollTimer: ReturnType<typeof setInterval> | null = null
  let inFlightPoll = false

  function set(next: Partial<KeepaliveUiState>): void {
    state = { ...state, ...next }
    for (const listener of listeners) listener(state)
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
    setPanelOpen(open) {
      set({ panelOpen: open })
    },
    async updateConfig(patch) {
      try {
        const response = await fetchLike('/plugins/dsh-keepalive/config', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(patch)
        })
        if (!response.ok) throw new Error('config ' + String(response.status))
        await pollStatus()
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) })
      }
    },
    async act(type, provider) {
      try {
        const response = await fetchLike('/plugins/dsh-keepalive/action', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ type, ...(provider === undefined ? {} : { provider }) })
        })
        if (!response.ok) throw new Error('action ' + String(response.status))
        await pollStatus()
      } catch (error) {
        set({ error: error instanceof Error ? error.message : String(error) })
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
    }
  }
}
