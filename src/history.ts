/**
 * History ring + daily aggregates - pure functions over JSON-safe data.
 * The store layer owns persistence; nothing here touches ctx or IO.
 */
import type { DailyStat, HistoryEntry } from './types.ts'

/** Prepend an entry (newest-first) and cap the list length. */
export function appendHistory(items: HistoryEntry[], entry: HistoryEntry, limit: number): HistoryEntry[] {
  const next = [entry, ...items]
  return next.length > limit ? next.slice(0, limit) : next
}

/** Fold one shot into the per-day bucket for its local calendar day. */
export function bumpDailyStats(
  stats: Record<string, DailyStat>,
  day: string,
  status: HistoryEntry['status'],
  latencyMs: number
): Record<string, DailyStat> {
  if (status !== 'ok' && status !== 'fail') return stats
  const bucket = stats[day] ?? { success: 0, fail: 0, latencyTotalMs: 0 }
  const next: DailyStat = {
    success: bucket.success + (status === 'ok' ? 1 : 0),
    fail: bucket.fail + (status === 'fail' ? 1 : 0),
    latencyTotalMs: bucket.latencyTotalMs + (status === 'ok' ? latencyMs : 0)
  }
  return { ...stats, [day]: next }
}

/** Minimal table face recordDailyShot needs (the host KvTable satisfies it). */
export interface StatsTableLike {
  get(day: string): DailyStat | undefined
  put(day: string, value: DailyStat): Promise<void>
  update(day: string, fn: (current: DailyStat) => DailyStat): Promise<DailyStat>
}

/**
 * Upsert one shot into its day bucket. The storage domain's update() rejects
 * with `missing-key` when the record does not exist yet (first shot of a
 * day), so on that rejection the bucket is created via get+put; update stays
 * primary so concurrent shots keep their read-modify-write atomicity.
 */
export function recordDailyShot(table: StatsTableLike, day: string, status: HistoryEntry['status'], latencyMs: number): Promise<void> {
  const next = (current: DailyStat | undefined): DailyStat =>
    bumpDailyStats(current === undefined ? {} : { [day]: current }, day, status, latencyMs)[day] ?? { success: 0, fail: 0, latencyTotalMs: 0 }
  return table
    .update(day, (current) => next(current))
    .catch(() => table.put(day, next(table.get(day))))
    .then(() => undefined)
}

/** Drop day buckets strictly older than (today - keepDays). Lexicographic ISO dates compare safely. */
export function pruneDailyStats(
  stats: Record<string, DailyStat>,
  today: string,
  keepDays: number
): Record<string, DailyStat> {
  const horizon = new Date(today + 'T00:00:00').getTime() - keepDays * 86400000
  const kept: Record<string, DailyStat> = {}
  for (const day of Object.keys(stats)) {
    if (new Date(day + 'T00:00:00').getTime() >= horizon) kept[day] = stats[day]!
  }
  return kept
}
