/** Prepend an entry (newest-first) and cap the list length. */
export function appendHistory(items, entry, limit) {
    const next = [entry, ...items];
    return next.length > limit ? next.slice(0, limit) : next;
}
/** Fold one shot into the per-day bucket for its local calendar day. */
export function bumpDailyStats(stats, day, status, latencyMs) {
    if (status !== 'ok' && status !== 'fail')
        return stats;
    const bucket = stats[day] ?? { success: 0, fail: 0, latencyTotalMs: 0 };
    const next = {
        success: bucket.success + (status === 'ok' ? 1 : 0),
        fail: bucket.fail + (status === 'fail' ? 1 : 0),
        latencyTotalMs: bucket.latencyTotalMs + (status === 'ok' ? latencyMs : 0)
    };
    return { ...stats, [day]: next };
}
/** Drop day buckets strictly older than (today - keepDays). Lexicographic ISO dates compare safely. */
export function pruneDailyStats(stats, today, keepDays) {
    const horizon = new Date(today + 'T00:00:00').getTime() - keepDays * 86400000;
    const kept = {};
    for (const day of Object.keys(stats)) {
        if (new Date(day + 'T00:00:00').getTime() >= horizon)
            kept[day] = stats[day];
    }
    return kept;
}
//# sourceMappingURL=history.js.map