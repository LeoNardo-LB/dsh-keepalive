import { describe, expect, it } from 'vitest'
import { MIN_INTERVAL_MS, clampIntervalMinutes, nextDelayMs, remainingMs } from '../src/interval.ts'

describe('clampIntervalMinutes', () => {
  it('keeps values at or above one minute', () => {
    expect(clampIntervalMinutes(30)).toBe(30)
    expect(clampIntervalMinutes(1)).toBe(1)
  })
  it('raises values below one minute to the floor', () => {
    expect(clampIntervalMinutes(0.5)).toBe(1)
    expect(clampIntervalMinutes(0)).toBe(1)
    expect(clampIntervalMinutes(-10)).toBe(1)
  })
  it('rejects non-finite values with the floor', () => {
    expect(clampIntervalMinutes(Number.NaN)).toBe(1)
  })
})

describe('nextDelayMs', () => {
  const BASE = 30 * 60_000
  it('returns the base when jitter is zero', () => {
    expect(nextDelayMs(BASE, 0, () => 0.99)).toBe(BASE)
  })
  it('maps rand 0 to the lower bound and rand 1 to the upper bound', () => {
    expect(nextDelayMs(BASE, 20, () => 0)).toBe(24 * 60_000)
    expect(nextDelayMs(BASE, 20, () => 1)).toBe(36 * 60_000)
  })
  it('maps rand 0.5 to the base', () => {
    expect(nextDelayMs(BASE, 20, () => 0.5)).toBe(BASE)
  })
  it('never returns less than MIN_INTERVAL_MS even with extreme jitter', () => {
    const floor = nextDelayMs(60_000, 90, () => 0)
    expect(floor).toBeGreaterThanOrEqual(MIN_INTERVAL_MS)
  })
  it('rejects negative jitter percent input by treating it as zero deviation direction-safe', () => {
    // negative jitter must not invert the bounds; clamp to >= 0
    expect(nextDelayMs(BASE, -50, () => 1)).toBe(BASE)
  })
})

describe('remainingMs', () => {
  it('is positive before the deadline and zero after', () => {
    expect(remainingMs(1_000, 400)).toBe(600)
    expect(remainingMs(1_000, 1_000)).toBe(0)
    expect(remainingMs(1_000, 2_000)).toBe(0)
  })
})
