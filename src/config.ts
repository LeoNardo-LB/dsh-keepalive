/**
 * Schemastery schema for the dsh-keepalive settings namespace.
 * The settings document is the SINGLE source of user-adjustable truth
 * (AGENTS red line); the composition-layer entry config only seeds defaults.
 */
import z from '@deepseek-ai/schemastery'
import type { KeepaliveConfig } from './types.ts'

const providerConfig = z.object({
  enabled: z.boolean().default(true),
  /** Absent (omitted) = the provider's default model; never written as null. */
  model: z.string()
})

/**
 * Runtime schema for the settings namespace shape. The root is volatile:
 * on the 0.1.7+ entry model every field is live-editable through the
 * settings service, and writes mutate the running config object in place
 * (loader volatile update) instead of remounting this entry.
 */
export const Config = z.object({
  enabled: z.boolean().default(false),
  intervalMinutes: z.number().min(1).default(30),
  jitterPercent: z.number().min(0).max(100).default(20),
  autoPause: z.object({
    enabled: z.boolean().default(true),
    threshold: z.number().min(1).default(5)
  }),
  providers: z.dict(providerConfig)
}).volatile() as unknown as z<KeepaliveConfig>
