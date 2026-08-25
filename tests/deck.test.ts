import { describe, expect, it } from 'vitest'
import { createPhraseDeck } from '../src/deck.ts'

describe('createPhraseDeck', () => {
  it('does not repeat a phrase within one full cycle', () => {
    const deck = createPhraseDeck(3, () => 0)
    const drawn = [deck.draw(), deck.draw(), deck.draw()]
    expect(new Set(drawn).size).toBe(3)
  })
  it('reshuffles after exhaustion (all phrases seen again)', () => {
    const deck = createPhraseDeck(5, () => 0.42)
    const first = new Set(Array.from({ length: 5 }, () => deck.draw()))
    const second = new Set(Array.from({ length: 5 }, () => deck.draw()))
    expect(first.size).toBe(5)
    expect(second.size).toBe(5)
  })
  it('handles a single-phrase deck', () => {
    const deck = createPhraseDeck(1, () => 0.7)
    expect(deck.draw()).toBeDefined()
    expect(deck.draw()).toBeDefined()
  })
})
