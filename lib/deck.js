/**
 * Fisher-Yates phrase deck: draws every phrase once before reshuffling, so
 * consecutive keepalives never repeat a phrase within a cycle.
 */
/** Create a deck over phrase indices [0, size). */
export function createPhraseDeck(size, rand) {
    const indices = Array.from({ length: size }, (_, index) => index);
    let remaining = [];
    const refill = () => {
        remaining = [...indices];
        for (let i = remaining.length - 1; i > 0; i -= 1) {
            const j = Math.floor(rand() * (i + 1));
            const tmp = remaining[i];
            remaining[i] = remaining[j];
            remaining[j] = tmp;
        }
    };
    refill();
    return {
        draw() {
            if (remaining.length === 0)
                refill();
            return String(remaining.pop());
        },
    };
}
//# sourceMappingURL=deck.js.map