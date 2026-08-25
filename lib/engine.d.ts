import type { Keeper, ShotResult } from './keeper.ts';
import type { KeepaliveConfig, ProviderStatus } from './types.ts';
/** Minimal scheduler face (ctx.timeout satisfies this). */
export interface Scheduler {
    timeout(callback: () => void, delay: number): () => void;
}
/** Face of the llm service the engine needs (listModels subset). */
export interface ModelResolver {
    (provider: string): Promise<string | null>;
}
export interface EngineDeps {
    scheduler: Scheduler;
    keeper: Keeper;
    resolveModel: ModelResolver;
    config: () => KeepaliveConfig;
    /** Persist one shot (history + stats); async, errors handled by caller. */
    onShot: (provider: string, model: string, result: ShotResult, at: number) => void;
    /** Persist the nextFireAt map for catch-up; async, errors handled by caller. */
    persistNextFire: (map: Record<string, number>) => void;
    /** Load the persisted nextFireAt map (catch-up source); null when absent. */
    loadNextFire: () => Record<string, number> | null;
    logger: {
        info: (message: string) => void;
        warn: (message: string) => void;
    };
    now: () => number;
    rand: () => number;
    /** Delay before a catch-up shot after a missed deadline (default 5s). */
    catchUpDelayMs?: number;
}
export interface Engine {
    start(): Promise<void>;
    reschedule(): Promise<void>;
    pause(): void;
    resume(): void;
    fireNow(provider: string): Promise<ShotResult | undefined>;
    resumeProvider(provider: string): void;
    isPaused(): boolean;
    snapshot(): ProviderStatus[];
    dispose(): void;
}
/** Create the engine. Everything injectable; see EngineDeps. */
export declare function createEngine(deps: EngineDeps): Engine;
//# sourceMappingURL=engine.d.ts.map