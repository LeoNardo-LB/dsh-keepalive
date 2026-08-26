/**
 * dsh-keepalive host half: wire the settings namespace, the storage domain,
 * the scheduling engine, and the HTTP face together. Silent by design — no
 * sessions, no session events, no system-prompt presence (AGENTS red line).
 *
 * @module dsh-keepalive
 */
import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.ts';
import type { KeepaliveConfig } from './types.ts';
export declare const name = "dsh-keepalive";
/** Host services required before activation (fail-loud when missing). */
export declare const inject: string[];
export { Config };
/**
 * Install dsh-keepalive. The composition-layer entry config flows in as the
 * settings namespace base layer (below user settings): dev overlays seed
 * defaults, the user document stays the live-adjustable truth. Async init
 * runs as a guarded background task so the plugin activates synchronously;
 * failures log loudly instead of throwing into the fiber.
 */
export declare function apply(ctx: Context, config?: Partial<KeepaliveConfig>): void;
//# sourceMappingURL=index.d.ts.map