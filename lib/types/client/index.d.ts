import type { ClientContext } from '@deepseek-ai/dsh-client-runtime/client';
export { countdownMs, createInitialUiState, formatCountdown } from './store.ts';
export { createStore } from './store-instance.ts';
export { Dock } from './Dock.tsx';
export { Panel } from './Panel.tsx';
export type { KeepaliveStore, KeepaliveUiState } from './store.ts';
/** Required client services: the slot registry. */
export declare const inject: string[];
/**
 * Client plugin body: start polling and register both seats through
 * declaration-aware inject wrappers (idempotent across re-registration).
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map