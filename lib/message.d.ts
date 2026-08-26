/**
 * Keepalive message construction: "phrase + ISO8601 timestamp + 8 hex chars".
 * Deterministic given an injected clock and rand source.
 */
/** Format a date as ISO8601 with an explicit numeric timezone offset. */
export declare function formatTimestamp(date: Date): string;
/** Eight lowercase hex characters from an injectable uniform [0, 1) source. */
export declare function randomHex8(rand: () => number): string;
/** Instruction appended to every keepalive message (holds no spaces). */
export declare const SHORT_REPLY_SUFFIX = "(\u8BF7\u7528\u4E0D\u8D85\u8FC710\u4E2A\u5B57\u56DE\u590D)";
/** The full keepalive payload sent to the provider. */
export declare function buildKeepaliveMessage(phrase: string, now: Date, rand: () => number): string;
//# sourceMappingURL=message.d.ts.map