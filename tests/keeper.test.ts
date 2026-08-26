import { describe, expect, it } from 'vitest'
import { createKeeper } from '../src/keeper.ts'
import type { StreamChunk } from '@deepseek-ai/dsh-llm'

/** Scripted stream: yields the given chunks regardless of options. */
function scriptedStream(chunks: StreamChunk[]): () => AsyncIterable<StreamChunk> {
  return () =>
    (async function* () {
      for (const chunk of chunks) yield chunk
    })()
}

const okChunks = (): StreamChunk[] => [
  { type: 'text-delta', text: '你好' } as StreamChunk,
  { type: 'text-delta', text: '，我在' } as StreamChunk,
  { type: 'finish', reason: { kind: 'stop', extra: {} } } as unknown as StreamChunk
]

describe('keeper reply capture', () => {
  it('collects the full text reply across deltas', async () => {
    const keeper = createKeeper(scriptedStream(okChunks()), Math.random, Date.now)
    const result = await keeper.shoot('alpha', 'm1')
    expect(result.status).toBe('ok')
    expect(result.reply).toBe('你好，我在')
    // Preview stays a short head of the reply for table rendering.
    expect(result.preview.length).toBeLessThanOrEqual(result.reply!.length)
    expect(result.reply!.startsWith(result.preview)).toBe(true)
  })

  it('caps an over-long reply at 4000 characters', async () => {
    const long = 'x'.repeat(6000)
    const chunks: StreamChunk[] = [{ type: 'text-delta', text: long } as StreamChunk]
    const keeper = createKeeper(scriptedStream(chunks), Math.random, Date.now)
    const result = await keeper.shoot('alpha', 'm1')
    expect(result.reply!.length).toBe(4000)
  })

  it('keeps a partial reply when the stream errors midway', async () => {
    const chunks = async function* (): AsyncIterable<StreamChunk> {
      yield { type: 'text-delta', text: '部分' } as StreamChunk
      throw new Error('boom')
    }
    const keeper = createKeeper(() => chunks(), Math.random, Date.now)
    const result = await keeper.shoot('alpha', 'm1')
    expect(result.status).toBe('fail')
    expect(result.error).toContain('boom')
    expect(result.reply).toBe('部分')
  })
})
