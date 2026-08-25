import { describe, expect, it } from 'vitest'
import { createEngine } from '../src/engine.ts'
import type { EngineDeps, Scheduler } from '../src/engine.ts'
import type { ShotResult } from '../src/keeper.ts'
import type { KeepaliveConfig } from '../src/types.ts'

interface FakeTimer {
  id: number
  callback: () => void
  delay: number
  fired: boolean
}

function makeHarness(scripted: ShotResult[]) {
  const timers: FakeTimer[] = []
  let timerSeq = 0
  const scheduler: Scheduler = {
    timeout(callback, delay) {
      timerSeq += 1
      const timer: FakeTimer = { id: timerSeq, callback, delay, fired: false }
      timers.push(timer)
      return () => {
        timer.fired = true
        const index = timers.indexOf(timer)
        if (index >= 0) timers.splice(index, 1)
      }
    }
  }
  const shots: string[] = []
  let shotIndex = 0
  const keeper = {
    async shoot(provider: string): Promise<ShotResult> {
      shots.push(provider)
      const last = scripted.length - 1
      const result = shotIndex < last ? scripted[shotIndex] : scripted[last]
      shotIndex += 1
      return result ?? failShot
    }
  }
  let nowMs = 1_000_000
  const config: KeepaliveConfig = {
    enabled: true,
    intervalMinutes: 30,
    jitterPercent: 0,
    autoPause: { enabled: true, threshold: 2 },
    providers: { alpha: { enabled: true, model: null }, beta: { enabled: true, model: null } }
  }
  const onShots: Array<{ provider: string; status: string }> = []
  const persisted: Array<Record<string, number>> = []
  let savedNextFire: Record<string, number> | null = null
  const deps: EngineDeps = {
    scheduler,
    keeper,
    resolveModel: async () => 'default-model',
    config: () => config,
    onShot: (provider, _model, result) => onShots.push({ provider, status: result.status }),
    persistNextFire: (map) => persisted.push(map),
    loadNextFire: () => savedNextFire,
    logger: { info: () => undefined, warn: () => undefined },
    now: () => nowMs,
    rand: () => 0.5
  }
  const fireTimer = async (index: number): Promise<void> => {
    const timer = timers[index]
    if (timer === undefined || timer.fired) throw new Error('timer ' + String(index) + ' not pending')
    timers.splice(index, 1) // a fired timer never re-fires; drop it from pending
    timer.callback()
    await Promise.resolve()
    await Promise.resolve()
    await Promise.resolve()
  }
  return { timers, shots, onShots, persisted, config, getSaved: () => savedNextFire, setSaved: (value: Record<string, number> | null) => { savedNextFire = value }, deps, fireTimer, advance: (ms: number) => { nowMs += ms } }
}

const okShot: ShotResult = { status: 'ok', latencyMs: 120, content: 'c', preview: 'r' }
const failShot: ShotResult = { status: 'fail', latencyMs: 90, content: 'c', preview: '', error: 'boom' }

describe('engine scheduling', () => {
  it('schedules every enabled provider with the jittered base interval', async () => {
    const h = makeHarness([okShot])
    const engine = createEngine(h.deps)
    await engine.start()
    expect(h.timers.length).toBe(2)
    expect(h.timers.every((t) => t.delay === 30 * 60_000)).toBe(true)
  })

  it('clamps a sub-minute base interval to the 60s floor', async () => {
    const h = makeHarness([okShot])
    h.config.intervalMinutes = 0.5
    const engine = createEngine(h.deps)
    await engine.start()
    expect(h.timers.every((t) => t.delay >= 60_000)).toBe(true)
  })

  it('does not schedule when the master switch is off', async () => {
    const h = makeHarness([okShot])
    h.config.enabled = false
    const engine = createEngine(h.deps)
    await engine.start()
    expect(h.timers.length).toBe(0)
  })

  it('fires on timer, records the shot, and reschedules from completion', async () => {
    const h = makeHarness([okShot, okShot])
    const engine = createEngine(h.deps)
    await engine.start()
    await h.fireTimer(0)
    expect(h.shots).toEqual(['alpha'])
    expect(h.onShots).toEqual([{ provider: 'alpha', status: 'ok' }])
    // one timer for beta still pending + one reschedule for alpha
    expect(h.timers.length).toBe(2)
    const snap = engine.snapshot().find((row) => row.id === 'alpha')
    expect(snap?.lastResult?.status).toBe('ok')
    expect(snap?.consecutiveFailures).toBe(0)
  })
})

describe('engine catch-up', () => {
  it('fires a missed deadline after the grace delay', async () => {
    const h = makeHarness([okShot])
    h.setSaved({ alpha: 500_000 }) // long past
    const engine = createEngine(h.deps)
    await engine.start()
    const alphaTimer = h.timers.find((t) => t.delay === 5_000)
    expect(alphaTimer).toBeDefined()
    await h.fireTimer(h.timers.indexOf(alphaTimer!))
    expect(h.shots).toEqual(['alpha'])
  })

  it('keeps a future deadline with its remaining delay', async () => {
    const h = makeHarness([okShot])
    h.setSaved({ alpha: 1_000_000 + 120_000 })
    const engine = createEngine(h.deps)
    await engine.start()
    const future = h.timers.find((t) => t.delay === 120_000)
    expect(future).toBeDefined()
  })
})

describe('engine parking', () => {
  it('parks a provider after reaching the failure threshold', async () => {
    const h = makeHarness([failShot, failShot, okShot])
    h.config.providers = { alpha: { enabled: true, model: null } }
    const engine = createEngine(h.deps)
    await engine.start()
    await h.fireTimer(0)
    await h.fireTimer(0)
    const snap = engine.snapshot().find((row) => row.id === 'alpha')
    expect(snap?.parked).toBe(true)
    expect(snap?.nextFireAt).toBeNull()
    expect(h.timers.length).toBe(0)
  })

  it('resumeProvider clears parking and schedules again', async () => {
    const h = makeHarness([failShot, failShot, okShot])
    h.config.providers = { alpha: { enabled: true, model: null } }
    const engine = createEngine(h.deps)
    await engine.start()
    await h.fireTimer(0)
    await h.fireTimer(0)
    engine.resumeProvider('alpha')
    const snap = engine.snapshot().find((row) => row.id === 'alpha')
    expect(snap?.parked).toBe(false)
    expect(h.timers.length).toBe(1)
  })
})

describe('engine manual controls', () => {
  it('pause cancels timers and fireNow refuses while paused', async () => {
    const h = makeHarness([okShot])
    const engine = createEngine(h.deps)
    await engine.start()
    engine.pause()
    expect(h.timers.length).toBe(0)
    const result = await engine.fireNow('alpha')
    expect(result).toBeUndefined()
    engine.resume()
    expect(h.timers.length).toBe(2)
  })

  it('fireNow shoots immediately and reschedules', async () => {
    const h = makeHarness([okShot, okShot])
    const engine = createEngine(h.deps)
    await engine.start()
    const result = await engine.fireNow('beta')
    expect(result?.status).toBe('ok')
    expect(h.shots).toEqual(['beta'])
    expect(h.timers.length).toBe(2)
  })
})
