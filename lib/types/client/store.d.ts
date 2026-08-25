/**
 * Client-side state: one polling store over the host HTTP face. The store
 * owns ALL client state (single source); components read snapshots only.
 * Countdowns are computed from nextFireAt + serverNow skew locally.
 */
import type { DailyStat, HistoryEntry, KeepaliveConfig, StatusSnapshot } from '../types.ts';
export interface HistoryResponse {
    items: HistoryEntry[];
    dailyStats: Record<string, DailyStat>;
}
export interface KeepaliveUiState {
    status: StatusSnapshot | null;
    history: HistoryResponse | null;
    /** Local clock minus server clock at last poll; applied to countdowns. */
    skewMs: number;
    error: string | null;
    /** Panel visibility for the overlay seat. */
    panelOpen: boolean;
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
    setPanelOpen(open: boolean): void;
    updateConfig(patch: Partial<KeepaliveConfig>): Promise<void>;
    act(type: 'pause' | 'resume' | 'fire-now' | 'resume-provider', provider?: string): Promise<void>;
    loadHistory(limit: number): Promise<void>;
}
export declare function createStore(fetchLike: FetchLike, now: () => number, pollMs?: number): KeepaliveStore;
//# sourceMappingURL=store.d.ts.map