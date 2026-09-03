/**
 * History ring + daily aggregates - pure functions over JSON-safe data.
 * The store layer owns persistence; nothing here touches ctx or IO.
 */
import type { DailyStat, HistoryEntry } from './types.ts';
/** Prepend an entry (newest-first) and cap the list length. */
export declare function appendHistory(items: HistoryEntry[], entry: HistoryEntry, limit: number): HistoryEntry[];
/** Fold one shot into the per-day bucket for its local calendar day. */
export declare function bumpDailyStats(stats: Record<string, DailyStat>, day: string, status: HistoryEntry['status'], latencyMs: number): Record<string, DailyStat>;
/** Minimal table face recordDailyShot needs (the host KvTable satisfies it). */
export interface StatsTableLike {
    get(day: string): DailyStat | undefined;
    put(day: string, value: DailyStat): Promise<void>;
    update(day: string, fn: (current: DailyStat) => DailyStat): Promise<DailyStat>;
}
/**
 * Upsert one shot into its day bucket. The storage domain's update() rejects
 * with `missing-key` when the record does not exist yet (first shot of a
 * day), so on that rejection the bucket is created via get+put; update stays
 * primary so concurrent shots keep their read-modify-write atomicity.
 */
export declare function recordDailyShot(table: StatsTableLike, day: string, status: HistoryEntry['status'], latencyMs: number): Promise<void>;
/** Drop day buckets strictly older than (today - keepDays). Lexicographic ISO dates compare safely. */
export declare function pruneDailyStats(stats: Record<string, DailyStat>, today: string, keepDays: number): Record<string, DailyStat>;
//# sourceMappingURL=history.d.ts.map