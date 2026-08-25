/**
 * Keepalive message construction: "phrase + ISO8601 timestamp + 8 hex chars".
 * Deterministic given an injected clock and rand source.
 */
/** Format a date as ISO8601 with an explicit numeric timezone offset. */
export declare function formatTimestamp(date: Date): string;
/** Eight lowercase hex characters from an injectable uniform [0, 1) source. */
export declare function randomHex8(rand: () => number): string;
/** The full keepalive payload sent to the provider. */
export declare function buildKeepaliveMessage(phrase: string, now: Date, rand: () => number): string;
//# sourceMappingURL=message.d.ts.map