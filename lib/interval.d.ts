/**
 * Keepalive interval math — the single home of every delay calculation
 * (AGENTS red line: no inline arithmetic elsewhere).
 *
 * All values are milliseconds since epoch; jitter is a percentage of the
 * base interval drawn uniformly from [-jitter, +jitter].
 */
/** Hard floor for any keepalive interval (AGENTS red line: 60s minimum). */
export declare const MIN_INTERVAL_MS = 60000;
/** Clamp a user-facing interval in minutes to the 60s floor. */
export declare function clampIntervalMinutes(minutes: number): number;
/**
 * One jittered delay around the base interval.
 *
 * @param baseMs - base interval in milliseconds (already clamped upstream).
 * @param jitterPercent - deviation percentage, drawn uniformly; negative
 *   values are treated as 0 (bounds must never invert).
 * @param rand - uniform [0, 1) source, injectable for deterministic tests.
 * @returns delay in milliseconds, never below MIN_INTERVAL_MS.
 */
export declare function nextDelayMs(baseMs: number, jitterPercent: number, rand: () => number): number;
/** Milliseconds until deadlineMs, floored at zero. */
export declare function remainingMs(deadlineMs: number, nowMs: number): number;
//# sourceMappingURL=interval.d.ts.map