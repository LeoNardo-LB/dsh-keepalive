/**
 * dsh-keepalive host half: wire the settings namespace, the storage domain,
 * the scheduling engine, and the HTTP face together. Silent by design — no
 * sessions, no session events, no system-prompt presence (AGENTS red line).
 *
 * @module dsh-keepalive
 */
import type { Context } from '@deepseek-ai/cordis';
import { Config } from './config.ts';
export declare const name = "dsh-keepalive";
/** Host services required before activation (fail-loud when missing). */
export declare const inject: string[];
export { Config };
/**
 * Install dsh-keepalive. Async init runs as a guarded background task so the
 * plugin activates synchronously; failures log loudly instead of throwing
 * into the fiber (the panel surfaces the empty state).
 */
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map