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
