/**
 * Client-side state: one polling store over the host HTTP face. The store
 * owns ALL client state (single source); components read snapshots only.
 * Countdowns are computed from nextFireAt + serverNow skew locally. Every
 * mutating call reports back through a pending key (button state) and a
 * flash banner (result feedback).
 */
import type { DailyStat, HistoryEntry, KeepaliveConfig, StatusSnapshot } from '../types.ts';
export interface HistoryResponse {
    items: HistoryEntry[];
    dailyStats: Record<string, DailyStat>;
}
/** Per-provider model id lists (GET /models body). */
export interface ModelsResponse {
    models: Record<string, string[]>;
}
/** One transient result banner shown after a mutating action settles. */
export interface FlashMessage {
    seq: number;
    kind: 'ok' | 'err';
    text: string;
}
/** Optional per-call feedback metadata supplied by the calling button. */
export interface ActionMeta {
    /** Pending key; distinct per button so concurrent actions stay honest. */
    key?: string;
    /** Banner text on success; failures always banner kind 'err'. */
    ok?: string;
}
export interface KeepaliveUiState {
    status: StatusSnapshot | null;
    history: HistoryResponse | null;
    /** Local clock minus server clock at last poll; applied to countdowns. */
    skewMs: number;
    error: string | null;
    /** Per-provider model lists; null until first fetched. */
    models: Record<string, string[]> | null;
    /** Last settled action banner; the view unmounts it via clearFlash. */
    flash: FlashMessage | null;
    /** In-flight action keys (button spinners/disable states). */
    pending: Record<string, true>;
}
export type StoreListener = (state: KeepaliveUiState) => void;
export declare const POLL_INTERVAL_MS = 5000;
/** Read-only face of the fetch used by the store (injectable in tests). */
export type FetchLike = (url: string, init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
}) => Promise<{
    ok: boolean;
    status: number;
    json: () => Promise<unknown>;
}>;
export declare function createInitialUiState(): KeepaliveUiState;
/** Milliseconds until the provider's next shot, corrected by server skew. */
export declare function countdownMs(nextFireAt: number | null, state: KeepaliveUiState, nowMs: number): number | null;
/** mm:ss / h:mm:ss formatting for countdown labels. */
export declare function formatCountdown(ms: number | null): string;
export interface KeepaliveStore {
    getSnapshot(): KeepaliveUiState;
    subscribe(listener: StoreListener): () => void;
    start(): void;
    stop(): void;
    refresh(): Promise<void>;
    updateConfig(patch: Partial<KeepaliveConfig>, meta?: ActionMeta): Promise<void>;
    act(type: 'pause' | 'resume' | 'fire-now' | 'resume-provider' | 'remove-provider', provider?: string, meta?: ActionMeta): Promise<void>;
    loadHistory(limit: number): Promise<void>;
    loadModels(): Promise<void>;
    clearFlash(seq: number): void;
}
export declare function createStore(fetchLike: FetchLike, now: () => number, pollMs?: number): KeepaliveStore;
//# sourceMappingURL=store.d.ts.map