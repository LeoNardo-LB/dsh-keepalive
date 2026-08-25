import { describe, expect, it } from 'vitest'
import { appendHistory, bumpDailyStats, pruneDailyStats } from '../src/history.ts'

const entry = (at: number) => ({ provider: 'p', model: 'm', status: 'ok' as const, latencyMs: 100, content: 'c', preview: 'r', at })

describe('appendHistory', () => {
  it('appends newest-first and caps at the limit', () => {
    let items = appendHistory([], entry(1), 3)
    items = appendHistory(items, entry(2), 3)
    items = appendHistory(items, entry(3), 3)
    items = appendHistory(items, entry(4), 3)
    expect(items.map((i) => i.at)).toEqual([4, 3, 2])
  })
  it('keeps an empty list empty when limit is zero', () => {
    expect(appendHistory([], entry(1), 0)).toEqual([])
  })
})

describe('bumpDailyStats', () => {
  const day = '2026-08-25'
  it('creates a bucket on first success', () => {
    const stats = bumpDailyStats({}, day, 'ok', 150)
    expect(stats[day]).toEqual({ success: 1, fail: 0, latencyTotalMs: 150 })
  })
  it('accumulates failures separately', () => {
    let stats = bumpDailyStats({}, day, 'fail', 0)
    stats = bumpDailyStats(stats, day, 'fail', 0)
    expect(stats[day]).toEqual({ success: 0, fail: 2, latencyTotalMs: 0 })
  })
  it('ignores unknown status kinds defensively', () => {
    const stats = bumpDailyStats({}, day, 'weird' as 'ok', 10)
    expect(stats[day]).toBeUndefined()
  })
})

describe('pruneDailyStats', () => {
  it('drops days older than the horizon', () => {
    const stats = {
      '2026-05-01': { success: 1, fail: 0, latencyTotalMs: 1 },
      '2026-08-24': { success: 2, fail: 0, latencyTotalMs: 2 },
      '2026-08-25': { success: 3, fail: 0, latencyTotalMs: 3 },
    }
    const kept = pruneDailyStats(stats, '2026-08-25', 90)
    expect(Object.keys(kept).sort()).toEqual(['2026-08-24', '2026-08-25'])
  })
})
