/**
 * HTTP face under /plugins/dsh-keepalive/*: read-only status/history plus
 * config writes and manual actions. Native node:http handlers; the host
 * webserver's loopback trust fence is the security boundary, but every body
 * is still validated as untrusted input (trust-boundary rule).
 */
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Engine } from './engine.ts';
import type { KeepaliveConfig } from './types.ts';
export declare const ROUTE_PREFIX = "/plugins/dsh-keepalive";
export interface RoutesDeps {
    engine: Engine;
    config: () => KeepaliveConfig;
    /** Update the settings user layer (partial patch). */
    updateConfig: (patch: object) => Promise<void>;
    /** Newest-first history entries. */
    history: (limit: number, provider: string | undefined) => unknown[];
    /** Daily stat buckets keyed by day. */
    dailyStats: () => Record<string, unknown>;
    logger: {
        warn: (message: string) => void;
    };
    now: () => number;
}
type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;
/** The four route handlers keyed by their URL suffix. */
export interface RouteHandlers {
    status: Handler;
    history: Handler;
    config: Handler;
    action: Handler;
}
/** Build the four route handlers; registration happens in index.ts. */
export declare function createRoutes(deps: RoutesDeps): RouteHandlers;
export {};
//# sourceMappingURL=routes.d.ts.map