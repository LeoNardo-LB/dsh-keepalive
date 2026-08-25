/**
 * Keepalive message construction: "phrase + ISO8601 timestamp + 8 hex chars".
 * Deterministic given an injected clock and rand source.
 */

/** Format a date as ISO8601 with an explicit numeric timezone offset. */
export function formatTimestamp(date: Date): string {
  const pad = (value: number, width = 2): string => String(Math.abs(value)).padStart(width, '0')
  const offsetMinutes = -date.getTimezoneOffset()
  const sign = offsetMinutes >= 0 ? '+' : '-'
  const offset = sign + pad(Math.floor(Math.abs(offsetMinutes) / 60)) + ':' + pad(Math.abs(offsetMinutes) % 60)
  return (
    date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate()) +
    'T' + pad(date.getHours()) + ':' + pad(date.getMinutes()) + ':' + pad(date.getSeconds()) + offset
  )
}

/** Eight lowercase hex characters from an injectable uniform [0, 1) source. */
export function randomHex8(rand: () => number): string {
  const digits = '0123456789abcdef'
  let out = ''
  for (let index = 0; index < 8; index += 1) {
    out += digits[Math.floor(rand() * 16) % 16]
  }
  return out
}

/** The full keepalive payload sent to the provider. */
export function buildKeepaliveMessage(phrase: string, now: Date, rand: () => number): string {
  return phrase + ' ' + formatTimestamp(now) + ' ' + randomHex8(rand)
}
