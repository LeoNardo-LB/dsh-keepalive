import { describe, expect, it } from 'vitest'
import { createKeeper } from '../src/keeper.ts'
import { MAX_REPLY_TOKENS } from '../src/keeper.ts'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'

/** Scripted stream: records options, yields the given chunks. */
function scriptedStream(chunks: StreamChunk[]): { calls: GenerateOptions[]; stream: () => AsyncIterable<StreamChunk> } {
  const calls: GenerateOptions[] = []
  const recording = ((options: GenerateOptions) => {
    calls.push(options)
    return (async function* () {
      for (const chunk of chunks) yield chunk
    })()
  }) as unknown as () => AsyncIterable<StreamChunk>
  return { calls, stream: recording }
}

const okChunks = (): StreamChunk[] => [
  { type: 'text-delta', text: '你好' } as StreamChunk,
  { type: 'text-delta', text: '，我在' } as StreamChunk,
  { type: 'finish', reason: { kind: 'stop', extra: {} } } as unknown as StreamChunk
]

describe('keeper reply capture', () => {
  it('collects the full text reply across deltas', async () => {
    const { stream } = scriptedStream(okChunks())
    const keeper = createKeeper(stream, Math.random, Date.now)
    const result = await keeper.shoot('alpha', 'm1')
    expect(result.status).toBe('ok')
    expect(result.reply).toBe('你好，我在')
    // Preview stays a short head of the reply for table rendering.
    expect(result.preview.length).toBeLessThanOrEqual(result.reply!.length)
    expect(result.reply!.startsWith(result.preview)).toBe(true)
  })

  it('bounds the reply budget with maxTokens and asks for ten characters', async () => {
    const { calls, stream } = scriptedStream(okChunks())
    const keeper = createKeeper(stream, Math.random, Date.now)
    await keeper.shoot('alpha', 'm1')
    expect(calls).toHaveLength(1)
    expect(calls[0]!.maxTokens).toBe(MAX_REPLY_TOKENS)
    expect(String(MAX_REPLY_TOKENS)).toMatch(/32|24/)
    const text = JSON.stringify(calls[0]!.messages)
    expect(text).toContain('10个字')
  })

  it('caps an over-long reply at 4000 characters', async () => {
    const long = 'x'.repeat(6000)
    const chunks: StreamChunk[] = [{ type: 'text-delta', text: long } as StreamChunk]
    const { stream } = scriptedStream(chunks)
    const keeper = createKeeper(stream, Math.random, Date.now)
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
