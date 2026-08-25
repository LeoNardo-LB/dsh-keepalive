/**
 * Storage domain declaration: history ring + per-day stats + the nextFireAt
 * map used for catch-up after restarts. Schemas are zod (the domain layer's
 * durable-boundary vocabulary); plugin Config stays schemastery.
 */
import { defineDomain, domainTable } from '@deepseek-ai/dsh-storage-domain'
import { z as zod } from 'zod'

const historyEntry = zod.object({
  provider: zod.string(),
  model: zod.string(),
  status: zod.enum(['ok', 'fail']),
  latencyMs: zod.number(),
  content: zod.string(),
  preview: zod.string(),
  at: zod.number(),
  error: zod.string().optional()
})

const dailyStat = zod.object({
  success: zod.number(),
  fail: zod.number(),
  latencyTotalMs: zod.number()
})

/**
 * The keepalive domain: name is the unit name under $DSH_HOME/storages.
 * Unit names must match /^[a-z][a-z0-9_]*$/ (no hyphens) - storage-domain
 * validates at module load and fails loud otherwise.
 */
export const keepaliveDomain = defineDomain({
  name: 'dsh_keepalive',
  version: 1,
  global: {
    schema: zod.object({ nextFireAt: zod.record(zod.string(), zod.number()) }),
    initial: { nextFireAt: {} }
  },
  tables: {
    history: domainTable(historyEntry),
    stats: domainTable(dailyStat)
  }
})
