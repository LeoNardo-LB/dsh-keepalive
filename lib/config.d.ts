/**
 * Schemastery schema for the dsh-keepalive settings namespace.
 * The settings document is the SINGLE source of user-adjustable truth
 * (AGENTS red line); the composition-layer entry config only seeds defaults.
 */
import z from '@deepseek-ai/schemastery';
import type { KeepaliveConfig } from './types.ts';
/** Runtime schema for the settings namespace shape. */
export declare const Config: z<KeepaliveConfig>;
//# sourceMappingURL=config.d.ts.map