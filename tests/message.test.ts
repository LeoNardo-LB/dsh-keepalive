import { describe, expect, it } from 'vitest'
import { buildKeepaliveMessage, formatTimestamp, randomHex8 } from '../src/message.ts'

/**
 * Independent truth source for the local offset: Intl longOffset prints
 * "GMT+08:00" style names without sharing code with formatTimestamp.
 */
function localOffset(date: Date): string {
  const part = new Intl.DateTimeFormat('en-US', { timeZoneName: 'longOffset' })
    .formatToParts(date)
    .find((p) => p.type === 'timeZoneName')
  const raw = part?.value ?? 'GMT+00:00'
  return raw === 'GMT' ? '+00:00' : raw.replace('GMT', '')
}

const LOCAL_DATE = new Date(2026, 7, 25, 17, 41, 3) // local components, TZ-independent instant semantics

// Note: backslash escapes are fragile through the write pipeline; character
// classes ([0-9] etc.) keep these patterns backslash-free on purpose.
const ISO_SHAPE = new RegExp('^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}[+-][0-9]{2}:[0-9]{2}$')
const HEX8_TAIL = new RegExp(' [0-9a-f]{8}$')

describe('formatTimestamp', () => {
  it('renders local time with the machine offset in +/-HH:MM form', () => {
    const expected = '2026-08-25T17:41:03' + localOffset(LOCAL_DATE)
    expect(formatTimestamp(LOCAL_DATE)).toBe(expected)
  })
  it('always matches the full ISO-like shape with signed offset', () => {
    expect(formatTimestamp(new Date(0))).toMatch(ISO_SHAPE)
  })
})

describe('randomHex8', () => {
  it('produces exactly eight lowercase hex characters', () => {
    expect(randomHex8(() => 0)).toMatch(new RegExp('^[0-9a-f]{8}$'))
    expect(randomHex8(() => 0.999999)).toMatch(new RegExp('^[0-9a-f]{8}$'))
  })
  it('is deterministic for a deterministic rand', () => {
    expect(randomHex8(() => 0)).toBe(randomHex8(() => 0))
  })
})

describe('buildKeepaliveMessage', () => {
  it('joins phrase, timestamp and hex suffix with single spaces', () => {
    const msg = buildKeepaliveMessage('还在吗', LOCAL_DATE, () => 0)
    const ts = '2026-08-25T17:41:03' + localOffset(LOCAL_DATE)
    expect(msg.startsWith('还在吗 ' + ts + ' ')).toBe(true)
    expect(msg).toMatch(HEX8_TAIL)
    expect(msg.split(' ')).toHaveLength(3)
  })
})
