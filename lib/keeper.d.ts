import type { GenerateOptions, StreamChunk } from '@deepseek-ai/dsh-llm';
/** Structural face of ctx.llm.stream for injectable tests. */
export type LlmStream = (options: GenerateOptions) => AsyncIterable<StreamChunk>;
/** Outcome of one shot, ready for history persistence. */
export interface ShotResult {
    status: 'ok' | 'fail';
    latencyMs: number;
    /** Full outbound message content. */
    content: string;
    /** The model's text reply (head-capped for storage). */
    reply: string;
    /** First characters of the model's text reply (table cell). */
    preview: string;
    /** Human-readable failure reason when status is fail. */
    error?: string;
}
export interface Keeper {
    shoot(provider: string, model: string): Promise<ShotResult>;
}
/**
 * Token budget for one keepalive reply: ~10 Chinese characters need at most
 * a few dozen tokens across tokenizers (1-2 tokens per CJK char). The prompt
 * (SHORT_REPLY_SUFFIX) asks for ten characters; this is the hard cost cap.
 */
export declare const MAX_REPLY_TOKENS = 32;
/**
 * Create a keeper over an injectable stream/clock/rand triple.
 * All three stay injectable so unit tests are fully deterministic.
 */
export declare function createKeeper(stream: LlmStream, rand: () => number, now: () => number): Keeper;
//# sourceMappingURL=keeper.d.ts.map