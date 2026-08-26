/**
 * One keepalive shot: build the message, stream it through ctx.llm with
 * maxTokens 1, read the WHOLE stream (never abort mid-flight), and fold the
 * outcome into a ShotResult. Silent by design: no session, no events.
 */
import { createUserMessage } from '@deepseek-ai/dsh-llm'
import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm'
import { createPhraseDeck } from './deck.ts'
import { buildKeepaliveMessage } from './message.ts'
import { PHRASES } from './phrases.ts'

/** Structural face of ctx.llm.stream for injectable tests. */
export type LlmStream = (options: GenerateOptions) => AsyncIterable<StreamChunk>

/** Outcome of one shot, ready for history persistence. */
export interface ShotResult {
  status: 'ok' | 'fail'
  latencyMs: number
  /** Full outbound message content. */
  content: string
  /** The model's text reply (head-capped for storage). */
  reply: string
  /** First characters of the model's text reply (table cell). */
  preview: string
  /** Human-readable failure reason when status is fail. */
  error?: string
}

export interface Keeper {
  shoot(provider: string, model: string): Promise<ShotResult>
}

/** Response text kept per shot. */
const PREVIEW_CHARS = 20
/** Reply head kept per shot; longer streams are truncated here (one seat). */
const REPLY_CHARS = 4000

/**
 * Create a keeper over an injectable stream/clock/rand triple.
 * All three stay injectable so unit tests are fully deterministic.
 */
export function createKeeper(stream: LlmStream, rand: () => number, now: () => number): Keeper {
  const deck = createPhraseDeck(PHRASES.length, rand)
  return {
    async shoot(provider: string, model: string): Promise<ShotResult> {
      const startedAt = now()
      const index = Number(deck.draw())
      const phrase = PHRASES[index] ?? PHRASES[0]!
      const content = buildKeepaliveMessage(phrase, new Date(now()), rand)
      let reply = ''
      let error: string | undefined
      try {
        const chunks = stream({
          provider,
          model,
          maxTokens: 1,
          messages: [
            createUserMessage({
              content: [{ type: 'text', text: content }],
              source: { kind: 'user' }
            })
          ]
        })
        for await (const chunk of chunks) {
          if (chunk.type === 'text-delta') {
            reply = (reply + chunk.text).slice(0, REPLY_CHARS)
          } else if (chunk.type === 'finish') {
            const reason = chunk.reason
            if (reason.kind === 'error' || reason.kind === 'aborted') {
              error = reason.failure.message ?? reason.failure.code ?? reason.kind
            }
          }
        }
      } catch (thrown) {
        error = thrown instanceof Error ? thrown.message : String(thrown)
      }
      const latencyMs = Math.max(0, now() - startedAt)
      const preview = reply.slice(0, PREVIEW_CHARS)
      return error === undefined
        ? { status: 'ok', latencyMs, content, reply, preview }
        : { status: 'fail', latencyMs, content, reply, preview, error }
    }
  }
}
