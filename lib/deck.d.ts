/**
 * Fisher-Yates phrase deck: draws every phrase once before reshuffling, so
 * consecutive keepalives never repeat a phrase within a cycle.
 */
export interface PhraseDeck {
    /** Next phrase index; reshuffles on exhaustion. */
    draw(): string;
}
/** Create a deck over phrase indices [0, size). */
export declare function createPhraseDeck(size: number, rand: () => number): PhraseDeck;
//# sourceMappingURL=deck.d.ts.map