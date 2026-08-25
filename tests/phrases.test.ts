import { describe, expect, it } from 'vitest'
import { PHRASES } from '../src/phrases.ts'

describe('PHRASES', () => {
  it('contains exactly 100 entries', () => {
    expect(PHRASES).toHaveLength(100)
  })
  it('has no duplicates', () => {
    expect(new Set(PHRASES).size).toBe(100)
  })
  it('has no empty or whitespace-only entries', () => {
    for (const phrase of PHRASES) {
      expect(phrase.trim().length).toBeGreaterThan(0)
      expect(phrase).toBe(phrase.trim())
    }
  })
})
