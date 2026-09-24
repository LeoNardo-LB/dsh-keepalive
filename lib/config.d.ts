/**
 * Schemastery schema for the dsh-keepalive settings namespace.
 * The settings document is the SINGLE source of user-adjustable truth
 * (AGENTS red line); the composition-layer entry config only seeds defaults.
 */
import z from '@deepseek-ai/schemastery';
import type { KeepaliveConfig } from './types.ts';
/**
 * Runtime schema for the settings namespace shape. The root is volatile:
 * on the 0.1.7+ entry model every field is live-editable through the
 * settings service, and writes mutate the running config object in place
 * (loader volatile update) instead of remounting this entry.
 */
export declare const Config: z<KeepaliveConfig>;
//# sourceMappingURL=config.d.ts.map