import { describe, expect, it } from 'vitest'
import { createInitialUiState, createStore } from '../src/client/store.ts'
import type { FetchLike } from '../src/client/store.ts'

interface RecordedCall {
  url: string
  init?: { method?: string; body?: string }
}

/** Fake fetch serving an endpoint map, recording calls for assertions. */
function makeFetch(endpoints: Record<string, unknown>): { fetchLike: FetchLike; calls: RecordedCall[] } {
  const calls: RecordedCall[] = []
  const fetchLike = (async (url: string, init?: { method?: string }) => {
    calls.push({ url, init })
    const path = url.split('?')[0]!
    if (!(path in endpoints)) return { ok: false, status: 404, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => endpoints[path] }
  }) as unknown as FetchLike
  return { fetchLike, calls }
}

describe('keepalive store', () => {
  it('starts with no model lists', () => {
    const { fetchLike } = makeFetch({})
    const store = createStore(fetchLike, Date.now)
    expect(store.getSnapshot().models).toBeNull()
    expect(createInitialUiState().models).toBeNull()
  })

  it('loadModels fetches the listing and stores it', async () => {
    const { fetchLike } = makeFetch({ '/plugins/dsh-keepalive/models': { models: { alpha: ['m1', 'm2'], beta: [] } } })
    const store = createStore(fetchLike, Date.now)
    await store.loadModels()
    expect(store.getSnapshot().models).toEqual({ alpha: ['m1', 'm2'], beta: [] })
    expect(store.getSnapshot().error).toBeNull()
  })

  it('loadModels failure surfaces in error without wiping previous data', async () => {
    const failing = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as FetchLike
    const store = createStore(failing, Date.now)
    await store.loadModels()
    expect(store.getSnapshot().error).toContain('500')
    expect(store.getSnapshot().models).toBeNull()
  })
})

describe('action feedback', () => {
  it('flags the action pending in flight, then flashes the success text', async () => {
    let resolvePost: (value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void = () => undefined
    const deferred: FetchLike = (async (url: string, init?: { method?: string }) => {
      if (url.includes('/config') && init?.method === 'POST') {
        return new Promise((resolve) => { resolvePost = resolve })
      }
      return { ok: true, status: 200, json: async () => ({ enabled: true, providers: {} }) }
    }) as unknown as FetchLike
    const store = createStore(deferred, Date.now)
    const done = store.updateConfig({ enabled: true }, { key: 'master', ok: '已开启保活' })
    expect(store.getSnapshot().pending['master']).toBe(true)
    resolvePost({ ok: true, status: 200, json: async () => ({ ok: true }) })
    await done
    expect(store.getSnapshot().pending['master']).toBeUndefined()
    const flash = store.getSnapshot().flash
    expect(flash).not.toBeNull()
    expect(flash!.kind).toBe('ok')
    expect(flash!.text).toBe('已开启保活')
  })

  it('flashes an error kind when the request fails', async () => {
    const failing = (async () => ({ ok: false, status: 500, json: async () => ({}) })) as unknown as FetchLike
    const store = createStore(failing, Date.now)
    await store.act('fire-now', 'alpha', { key: 'fire:alpha', ok: '已触发立即发送' })
    const flash = store.getSnapshot().flash
    expect(flash!.kind).toBe('err')
    expect(flash!.text).toContain('立即发送')
    expect(flash!.text).toContain('500')
  })

  it('clearFlash removes only the matching sequence', async () => {
    const { fetchLike } = makeFetch({ '/plugins/dsh-keepalive/config': { ok: true } })
    const store = createStore(fetchLike, Date.now)
    await store.updateConfig({ enabled: true }, { key: 'master', ok: '已开启保活' })
    const first = store.getSnapshot().flash!
    store.clearFlash(first.seq + 999)
    expect(store.getSnapshot().flash!.seq).toBe(first.seq)
    store.clearFlash(first.seq)
    expect(store.getSnapshot().flash).toBeNull()
  })

  it('two concurrent actions keep independent pending keys', async () => {
    const gates: Array<(value: { ok: boolean; status: number; json: () => Promise<unknown> }) => void> = []
    const deferred: FetchLike = (async (_url: string, init?: { method?: string }) => {
      if (init?.method === 'POST') {
        return new Promise((resolve) => { gates.push(resolve) })
      }
      return { ok: true, status: 200, json: async () => ({}) }
    }) as unknown as FetchLike
    const store = createStore(deferred, Date.now)
    const a = store.updateConfig({ enabled: true }, { key: 'master', ok: '已开启保活' })
    const b = store.updateConfig({ intervalMinutes: 5 }, { key: 'config', ok: '已保存配置' })
    expect(Object.keys(store.getSnapshot().pending).sort()).toEqual(['config', 'master'])
    gates[0]!({ ok: true, status: 200, json: async () => ({ ok: true }) })
    await a
    expect(store.getSnapshot().pending['config']).toBe(true)
    gates[1]!({ ok: true, status: 200, json: async () => ({ ok: true }) })
    await b
    expect(store.getSnapshot().pending).toEqual({})
    expect(store.getSnapshot().flash!.text).toBe('已保存配置')
  })
})
