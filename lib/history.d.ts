/**
 * History ring + daily aggregates - pure functions over JSON-safe data.
 * The store layer owns persistence; nothing here touches ctx or IO.
 */
import type { DailyStat, HistoryEntry } from './types.ts';
/** Prepend an entry (newest-first) and cap the list length. */
export declare function appendHistory(items: HistoryEntry[], entry: HistoryEntry, limit: number): HistoryEntry[];
/** Fold one shot into the per-day bucket for its local calendar day. */
export declare function bumpDailyStats(stats: Record<string, DailyStat>, day: string, status: HistoryEntry['status'], latencyMs: number): Record<string, DailyStat>;
/** Drop day buckets strictly older than (today - keepDays). Lexicographic ISO dates compare safely. */
export declare function pruneDailyStats(stats: Record<string, DailyStat>, today: string, keepDays: number): Record<string, DailyStat>;
//# sourceMappingURL=history.d.ts.map