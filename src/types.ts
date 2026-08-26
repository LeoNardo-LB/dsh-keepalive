/** Shared JSON-safe types for dsh-keepalive (host <-> client contract). */

/** One keepalive config entry per provider. */
export interface ProviderConfig {
  /** Whether this provider participates in keepalive. */
  enabled: boolean
  /** Model id; null/undefined = the provider's default model. */
  model?: string | null
}

/** Plugin settings namespace shape (dsh-keepalive). */
export interface KeepaliveConfig {
  /** Master switch; first run defaults to false (user confirms in panel). */
  enabled: boolean
  /** Base interval in minutes; floored at 1 (60s). */
  intervalMinutes: number
  /** Jitter percentage drawn uniformly around the base. */
  jitterPercent: number
  /** Auto-park after consecutive failures. */
  autoPause: { enabled: boolean; threshold: number }
  /** Per-provider overrides keyed by provider id. */
  providers: Record<string, ProviderConfig>
}

/** One recorded keepalive shot. */
export interface HistoryEntry {
  provider: string
  model: string
  status: 'ok' | 'fail'
  latencyMs: number
  /** Full outbound message content. */
  content: string
  /** First characters of the model's reply. */
  preview: string
  /** Epoch ms. */
  at: number
  /** Failure reason when status is fail. */
  error?: string
}

/** Per-day aggregate bucket keyed by local YYYY-MM-DD. */
export interface DailyStat {
  success: number
  fail: number
  latencyTotalMs: number
}

/** Runtime view of one provider row in the status snapshot. */
export interface ProviderStatus {
  id: string
  model: string | null
  enabled: boolean
  /** Epoch ms of the next scheduled shot; null when idle/parked. */
  nextFireAt: number | null
  parked: boolean
  consecutiveFailures: number
  lastResult: { status: 'ok' | 'fail'; at: number; latencyMs: number } | null
}

/** One provider route currently registered in the llm service. */
export interface AvailableProvider {
  id: string
  name: string
}

/** GET /status response body. */
export interface StatusSnapshot {
  enabled: boolean
  config: KeepaliveConfig
  providers: ProviderStatus[]
  /** All provider routes registered at poll time (superset of config keys). */
  availableProviders: AvailableProvider[]
  /** Whether scheduling is manually paused (engine-level pause). */
  paused: boolean
  /** Server clock for client-side countdown calibration. */
  now: number
}
