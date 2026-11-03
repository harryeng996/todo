import { describe, expect, it } from 'vitest'
import { advance, isValidState, shuffledOrder } from './useQuotes.ts'

/** Deterministic random numbers for repeatable shuffles. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

describe('quote rotation', () => {
  it('shows every quote once before any repeats', () => {
    const random = seeded(42)
    let state = { order: shuffledOrder(10, random), position: 0 }
    const seen: number[] = []
    for (let i = 0; i < 10; i++) {
      seen.push(state.order[state.position])
      state = advance(state, random)
    }
    expect(new Set(seen).size).toBe(10)
  })

  it('never shows the same quote twice in a row across a reshuffle', () => {
    for (let seed = 1; seed < 200; seed++) {
      const random = seeded(seed)
      const state = { order: shuffledOrder(5, random), position: 4 }
      const next = advance(state, random)
      expect(next.position).toBe(0)
      expect(next.order[0]).not.toBe(state.order[4])
    }
  })

  it('rejects saved state that no longer fits the quote list', () => {
    expect(isValidState({ order: [2, 0, 1], position: 1 }, 3)).toBe(true)
    expect(isValidState({ order: [2, 0, 1], position: 1 }, 4)).toBe(false)
    expect(isValidState({ order: [0, 0, 1], position: 0 }, 3)).toBe(false)
    expect(isValidState({ order: [0, 1, 2], position: 3 }, 3)).toBe(false)
  })
})
