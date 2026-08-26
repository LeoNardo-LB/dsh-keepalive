/**
 * One keepalive shot: build the message, stream it through ctx.llm with
 * maxTokens 1, read the WHOLE stream (never abort mid-flight), and fold the
 * outcome into a ShotResult. Silent by design: no session, no events.
 */
import { createUserMessage } from '@deepseek-ai/dsh-llm';
import { createPhraseDeck } from "./deck.js";
import { buildKeepaliveMessage } from "./message.js";
import { PHRASES } from "./phrases.js";
/** Response text kept per shot. */
const PREVIEW_CHARS = 20;
/** Reply head kept per shot; longer streams are truncated here (one seat). */
const REPLY_CHARS = 4000;
/**
 * Token budget for one keepalive reply: ~10 Chinese characters need at most
 * a few dozen tokens across tokenizers (1-2 tokens per CJK char). The prompt
 * (SHORT_REPLY_SUFFIX) asks for ten characters; this is the hard cost cap.
 */
export const MAX_REPLY_TOKENS = 32;
/**
 * Create a keeper over an injectable stream/clock/rand triple.
 * All three stay injectable so unit tests are fully deterministic.
 */
export function createKeeper(stream, rand, now) {
    const deck = createPhraseDeck(PHRASES.length, rand);
    return {
        async shoot(provider, model) {
            const startedAt = now();
            const index = Number(deck.draw());
            const phrase = PHRASES[index] ?? PHRASES[0];
            const content = buildKeepaliveMessage(phrase, new Date(now()), rand);
            let reply = '';
            let error;
            try {
                const chunks = stream({
                    provider,
                    model,
                    maxTokens: MAX_REPLY_TOKENS,
                    messages: [
                        createUserMessage({
                            content: [{ type: 'text', text: content }],
                            source: { kind: 'user' }
                        })
                    ]
                });
                for await (const chunk of chunks) {
                    if (chunk.type === 'text-delta') {
                        reply = (reply + chunk.text).slice(0, REPLY_CHARS);
                    }
                    else if (chunk.type === 'finish') {
                        const reason = chunk.reason;
                        if (reason.kind === 'error' || reason.kind === 'aborted') {
                            error = reason.failure.message ?? reason.failure.code ?? reason.kind;
                        }
                    }
                }
            }
            catch (thrown) {
                error = thrown instanceof Error ? thrown.message : String(thrown);
            }
            const latencyMs = Math.max(0, now() - startedAt);
            const preview = reply.slice(0, PREVIEW_CHARS);
            return error === undefined
                ? { status: 'ok', latencyMs, content, reply, preview }
                : { status: 'fail', latencyMs, content, reply, preview, error };
        }
    };
}
//# sourceMappingURL=keeper.js.map