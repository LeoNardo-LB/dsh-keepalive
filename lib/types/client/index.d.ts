import type { Context as ClientContext } from '@deepseek-ai/cordis';
export { countdownMs, createInitialUiState, formatCountdown } from './store.ts';
export { createStore } from './store-instance.ts';
export { SettingsTab } from './SettingsTab.tsx';
export type { KeepaliveStore, KeepaliveUiState } from './store.ts';
export type { SettingsTabProps } from './SettingsTab.tsx';
/** Required client services: the slot registry. */
export declare const inject: string[];
/**
 * Client plugin body: start polling and register the Settings tab through a
 * declaration-aware inject wrapper (waits for the plugins section to declare
 * the tab list, rolls back with it).
 * @param ctx - client root context.
 */
export declare function apply(ctx: ClientContext): void;
//# sourceMappingURL=index.d.ts.map