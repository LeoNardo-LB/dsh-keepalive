import { describe, expect, it } from 'vitest'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { createRoutes } from '../src/routes.ts'
import type { Engine } from '../src/engine.ts'
import type { KeepaliveConfig } from '../src/types.ts'

function fakeReq(body?: unknown): IncomingMessage {
  const chunks = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  const req = {
    url: '/',
    async *[Symbol.asyncIterator]() {
      for (const chunk of chunks) yield chunk
    }
  }
  return req as unknown as IncomingMessage
}

function fakeRes(): { res: ServerResponse; statusCode: number; payload: unknown } {
  const state = { statusCode: 0, payload: undefined as unknown }
  const res = {
    writeHead(status: number) {
      state.statusCode = status
    },
    end(body?: string) {
      state.payload = body === undefined ? undefined : JSON.parse(body)
    }
  }
  return { res: res as unknown as ServerResponse, get statusCode() { return state.statusCode }, get payload() { return state.payload } }
}

function makeDeps() {
  const config: KeepaliveConfig = {
    enabled: true,
    intervalMinutes: 30,
    jitterPercent: 20,
    autoPause: { enabled: true, threshold: 5 },
    providers: { alpha: { enabled: true } }
  }
  const calls = { update: [] as object[], removed: [] as string[], reschedules: 0 }
  const engine = {
    snapshot: () => [{ id: 'alpha', model: 'm1', enabled: true, nextFireAt: 123, parked: false, consecutiveFailures: 0, lastResult: null }],
    isPaused: () => false,
    reschedule: async () => {
      calls.reschedules += 1
    }
  } as unknown as Engine
  const routes = createRoutes({
    engine,
    config: () => config,
    updateConfig: async (patch) => {
      calls.update.push(patch)
    },
    removeProvider: async (id) => {
      calls.removed.push(id)
    },
    listAvailableProviders: () => [
      { id: 'alpha', name: 'Alpha' },
      { id: 'beta', name: 'Beta' }
    ],
    listModels: async (provider: string) =>
      provider === 'alpha' ? ['m1', 'm2'] : provider === 'beta' ? [] : Promise.reject(new Error('nope')),
    history: () => [],
    dailyStats: () => ({}),
    logger: { warn: () => undefined },
    now: () => 42_000
  })
  return { routes, calls }
}

describe('routes status', () => {
  it('returns providers plus the available superset and server clock', async () => {
    const { routes } = makeDeps()
    const box = fakeRes()
    await routes.status(fakeReq(), box.res)
    expect(box.statusCode).toBe(200)
    const body = box.payload as { availableProviders: { id: string }[]; providers: { id: string }[]; now: number }
    expect(body.providers.map((p) => p.id)).toEqual(['alpha'])
    expect(body.availableProviders.map((p) => p.id)).toEqual(['alpha', 'beta'])
    expect(body.now).toBe(42_000)
  })
})

describe('routes config', () => {
  it('forwards a providers patch as an incremental (merge) update', async () => {
    const { routes, calls } = makeDeps()
    const box = fakeRes()
    await routes.config(fakeReq({ providers: { beta: { enabled: true } } }), box.res)
    expect(box.statusCode).toBe(200)
    expect(calls.update).toEqual([{ providers: { beta: { enabled: true } } }])
  })
  it('rejects a non-boolean enabled with 400', async () => {
    const { routes } = makeDeps()
    const box = fakeRes()
    await routes.config(fakeReq({ enabled: 'yes' }), box.res)
    expect(box.statusCode).toBe(400)
  })
  it('clamps a sub-minute interval before forwarding', async () => {
    const { routes, calls } = makeDeps()
    const box = fakeRes()
    await routes.config(fakeReq({ intervalMinutes: 0.2 }), box.res)
    expect(calls.update).toEqual([{ intervalMinutes: 1 }])
  })
})

describe('routes action', () => {
  it('remove-provider unsets via the injected remover and reschedules', async () => {
    const { routes, calls } = makeDeps()
    const box = fakeRes()
    await routes.action(fakeReq({ type: 'remove-provider', provider: 'alpha' }), box.res)
    expect(box.statusCode).toBe(200)
    expect(calls.removed).toEqual(['alpha'])
    expect(calls.reschedules).toBe(1)
  })
  it('remove-provider without a provider id is a 400', async () => {
    const { routes } = makeDeps()
    const box = fakeRes()
    await routes.action(fakeReq({ type: 'remove-provider' }), box.res)
    expect(box.statusCode).toBe(400)
  })
  it('unknown action type is a 400', async () => {
    const { routes } = makeDeps()
    const box = fakeRes()
    await routes.action(fakeReq({ type: 'nope' }), box.res)
    expect(box.statusCode).toBe(400)
  })
})

describe('routes models', () => {
  it('returns every available provider with its model id list', async () => {
    const { routes } = makeDeps()
    const box = fakeRes()
    await routes.models(fakeReq(), box.res)
    expect(box.statusCode).toBe(200)
    const body = box.payload as { models: Record<string, string[]> }
    expect(body.models).toEqual({ alpha: ['m1', 'm2'], beta: [] })
  })

  it('maps a provider whose listing rejects to an empty list instead of failing the route', async () => {
    const { routes } = makeDeps()
    const box = fakeRes()
    // status snapshot keeps alpha/beta only, so no rejecting provider here;
    // simulate one by stubbing listAvailableProviders through a second build.
    const engine = { snapshot: () => [], isPaused: () => false, reschedule: async () => undefined } as unknown as Engine
    const config: KeepaliveConfig = {
      enabled: true,
      intervalMinutes: 30,
      jitterPercent: 20,
      autoPause: { enabled: true, threshold: 5 },
      providers: {}
    }
    const failing = createRoutes({
      engine,
      config: () => config,
      updateConfig: async () => undefined,
      removeProvider: async () => undefined,
      listAvailableProviders: () => [{ id: 'ghost', name: 'Ghost' }],
      listModels: async () => {
        throw new Error('unregistered')
      },
      history: () => [],
      dailyStats: () => ({}),
      logger: { warn: () => undefined },
      now: () => 0
    })
    await failing.models(fakeReq(), box.res)
    expect(box.statusCode).toBe(200)
    const body = box.payload as { models: Record<string, string[]> }
    expect(body.models).toEqual({ ghost: [] })
  })

  it('is not part of the action handler surface', async () => {
    const { routes } = makeDeps()
    const box = fakeRes()
    await routes.action(fakeReq({ type: 'list-models' }), box.res)
    expect(box.statusCode).toBe(400)
  })
})
