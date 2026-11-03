import { describe, expect, it } from 'vitest'
import {
  activeIds,
  advanceCursor,
  builtInId,
  mergeLibrary,
  moveItem,
  shuffled,
  syncCursor,
  type QuoteItem,
  type QuoteLibrary,
} from './quoteLibrary.ts'

/** Deterministic random numbers for repeatable shuffles. */
function seeded(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647
    return seed / 2147483647
  }
}

const builtIns = [
  { text: 'One', author: 'A' },
  { text: 'Two', author: 'B' },
]
const mine = (id: string): QuoteItem => ({
  id,
  text: `Mine ${id}`,
  author: 'Me',
  builtIn: false,
  enabled: true,
})

describe('mergeLibrary', () => {
  it('starts with every built-in quote, enabled', () => {
    expect(
      mergeLibrary(null, builtIns).map((q) => [q.text, q.builtIn, q.enabled]),
    ).toEqual([
      ['One', true, true],
      ['Two', true, true],
    ])
  })

  it('keeps the saved order and choices, adds new built-ins, drops removed ones', () => {
    const saved = [
      mine('x'),
      { ...mergeLibrary(null, builtIns)[1], enabled: false }, // Two, hidden
      {
        id: builtInId('Gone'),
        text: 'Gone',
        author: '?',
        builtIn: true,
        enabled: true,
      },
    ]
    const merged = mergeLibrary(saved, [
      ...builtIns,
      { text: 'Three', author: 'C' },
    ])
    expect(merged.map((q) => [q.text, q.enabled])).toEqual([
      ['Mine x', true],
      ['Two', false],
      ['One', true],
      ['Three', true],
    ])
  })
})

describe('activeIds', () => {
  const library: QuoteLibrary = {
    items: [
      mine('x'),
      ...mergeLibrary(null, builtIns),
      { ...mine('y'), enabled: false },
    ],
    order: 'custom',
    includeBuiltIn: true,
    rotate: true,
    intervalSec: 60,
  }

  it('lists enabled quotes in arranged order', () => {
    expect(activeIds(library)).toEqual([
      'x',
      builtInId('One'),
      builtInId('Two'),
    ])
  })

  it('can leave out the built-in quotes', () => {
    expect(activeIds({ ...library, includeBuiltIn: false })).toEqual(['x'])
  })
})

describe('cursor', () => {
  it('"My order" follows the list, keeps the current quote and loops', () => {
    const cursor = syncCursor(
      { order: ['a', 'b', 'c'], position: 2 },
      ['c', 'a', 'b'],
      'custom',
    )
    expect(cursor).toEqual({ order: ['c', 'a', 'b'], position: 0 }) // still on "c"
    const second = advanceCursor(cursor, 'custom')
    expect(second.order[second.position]).toBe('a')
    expect(
      advanceCursor({ order: ['c', 'a', 'b'], position: 2 }, 'custom').position,
    ).toBe(0)
  })

  it('shuffle keeps its sequence while the set is unchanged', () => {
    const cursor = { order: ['b', 'a', 'c'], position: 1 }
    expect(syncCursor(cursor, ['a', 'b', 'c'], 'shuffle')).toBe(cursor)
  })

  it('shuffle reshuffles a changed set with the current quote first', () => {
    const cursor = syncCursor(
      { order: ['b', 'a'], position: 1 },
      ['a', 'b', 'c'],
      'shuffle',
      seeded(3),
    )
    expect(cursor.position).toBe(0)
    expect(cursor.order[0]).toBe('a')
    expect([...cursor.order].sort()).toEqual(['a', 'b', 'c'])
  })

  it('shows every quote once per round and never repeats across a reshuffle', () => {
    for (let seed = 1; seed < 100; seed++) {
      const random = seeded(seed)
      let cursor = {
        order: shuffled(['a', 'b', 'c', 'd'], random),
        position: 0,
      }
      const seen: string[] = []
      for (let i = 0; i < 4; i++) {
        seen.push(cursor.order[cursor.position])
        cursor = advanceCursor(cursor, 'shuffle', random)
      }
      expect(new Set(seen).size).toBe(4)
      expect(cursor.order[0]).not.toBe(seen[3])
    }
  })

  it('handles an empty rotation', () => {
    expect(syncCursor({ order: ['a'], position: 0 }, [], 'shuffle')).toEqual({
      order: [],
      position: 0,
    })
  })
})

describe('moveItem', () => {
  it('moves up and down within bounds', () => {
    const items = [mine('a'), mine('b'), mine('c')]
    expect(moveItem(items, 'c', -1).map((q) => q.id)).toEqual(['a', 'c', 'b'])
    expect(moveItem(items, 'a', -1)).toBe(items)
    expect(moveItem(items, 'c', 1)).toBe(items)
  })
})
