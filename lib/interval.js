/**
 * Keepalive interval math — the single home of every delay calculation
 * (AGENTS red line: no inline arithmetic elsewhere).
 *
 * All values are milliseconds since epoch; jitter is a percentage of the
 * base interval drawn uniformly from [-jitter, +jitter].
 */
/** Hard floor for any keepalive interval (AGENTS red line: 60s minimum). */
export const MIN_INTERVAL_MS = 60_000;
/** Clamp a user-facing interval in minutes to the 60s floor. */
export function clampIntervalMinutes(minutes) {
    if (!Number.isFinite(minutes) || minutes < 1)
        return 1;
    return minutes;
}
/**
 * One jittered delay around the base interval.
 *
 * @param baseMs - base interval in milliseconds (already clamped upstream).
 * @param jitterPercent - deviation percentage, drawn uniformly; negative
 *   values are treated as 0 (bounds must never invert).
 * @param rand - uniform [0, 1) source, injectable for deterministic tests.
 * @returns delay in milliseconds, never below MIN_INTERVAL_MS.
 */
export function nextDelayMs(baseMs, jitterPercent, rand) {
    const jitter = Math.max(0, jitterPercent);
    const factor = 1 + (rand() * 2 - 1) * (jitter / 100);
    return Math.max(MIN_INTERVAL_MS, Math.round(baseMs * Math.max(0, factor)));
}
/** Milliseconds until deadlineMs, floored at zero. */
export function remainingMs(deadlineMs, nowMs) {
    return Math.max(0, deadlineMs - nowMs);
}
//# sourceMappingURL=interval.js.map