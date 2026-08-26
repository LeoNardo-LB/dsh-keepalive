/**
 * Keepalive message construction: "phrase + ISO8601 timestamp + 8 hex chars".
 * Deterministic given an injected clock and rand source.
 */
/** Format a date as ISO8601 with an explicit numeric timezone offset. */
export function formatTimestamp(date) {
    const pad = (value, width = 2) => String(Math.abs(value)).padStart(width, '0');
    const offsetMinutes = -date.getTimezoneOffset();
    const sign = offsetMinutes >= 0 ? '+' : '-';
    const offset = sign + pad(Math.floor(Math.abs(offsetMinutes) / 60)) + ':' + pad(Math.abs(offsetMinutes) % 60);
    return (date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
        'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) + offset);
}
/** Eight lowercase hex characters from an injectable uniform [0, 1) source. */
export function randomHex8(rand) {
    const digits = '0123456789abcdef';
    let out = '';
    for (let index = 0; index < 8; index += 1) {
        out += digits[Math.floor(rand() * 16) % 16];
    }
    return out;
}
/** Instruction appended to every keepalive message (holds no spaces). */
export const SHORT_REPLY_SUFFIX = '(请用不超过10个字回复)';
/** The full keepalive payload sent to the provider. */
export function buildKeepaliveMessage(phrase, now, rand) {
    return phrase + ' ' + formatTimestamp(now) + ' ' + randomHex8(rand) + ' ' + SHORT_REPLY_SUFFIX;
}
//# sourceMappingURL=message.js.map