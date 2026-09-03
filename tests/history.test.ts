import { describe, expect, it } from 'vitest'
import { appendHistory, bumpDailyStats, pruneDailyStats, recordDailyShot } from '../src/history.ts'

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

describe('recordDailyShot upsert', () => {
  const makeTable = (existing?: { success: number; fail: number; latencyTotalMs: number }) => {
    const store = new Map<string, { success: number; fail: number; latencyTotalMs: number }>()
    if (existing !== undefined) store.set('2026-09-04', existing)
    let updateRejected = false
    return {
      store,
      get updateRejectedOnMissing() { return updateRejected },
      get: (day: string) => store.get(day),
      put: (day: string, value: { success: number; fail: number; latencyTotalMs: number }) => { store.set(day, value); return Promise.resolve() },
      update: (day: string, fn: (current: { success: number; fail: number; latencyTotalMs: number }) => { success: number; fail: number; latencyTotalMs: number }) => {
        const current = store.get(day)
        if (current === undefined) { updateRejected = true; return Promise.reject(new Error('missing-key')) }
        const nextValue = fn(current)
        store.set(day, nextValue)
        return Promise.resolve(nextValue)
      }
    }
  }

  it('creates the first bucket of a day when update rejects missing-key', async () => {
    const table = makeTable()
    await recordDailyShot(table, '2026-09-04', 'ok', 500)
    expect(table.updateRejectedOnMissing).toBe(true)
    expect(table.store.get('2026-09-04')).toEqual({ success: 1, fail: 0, latencyTotalMs: 500 })
  })

  it('accumulates into an existing bucket through update', async () => {
    const table = makeTable({ success: 2, fail: 1, latencyTotalMs: 900 })
    await recordDailyShot(table, '2026-09-04', 'ok', 100)
    expect(table.store.get('2026-09-04')).toEqual({ success: 3, fail: 1, latencyTotalMs: 1000 })
  })

  it('counts failures without adding latency', async () => {
    const table = makeTable()
    await recordDailyShot(table, '2026-09-04', 'fail', 123)
    expect(table.store.get('2026-09-04')).toEqual({ success: 0, fail: 1, latencyTotalMs: 0 })
  })
})
