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
