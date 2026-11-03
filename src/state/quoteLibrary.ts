import type { Quote } from '../data/quotes.ts'

export interface QuoteItem {
  id: string
  text: string
  author: string
  builtIn: boolean
  /** Shown in the rotation (built-in quotes can be hidden, not deleted). */
  enabled: boolean
}

export type QuoteOrder = 'shuffle' | 'custom'

export interface QuoteLibrary {
  /** In the user's arranged order. */
  items: QuoteItem[]
  order: QuoteOrder
  includeBuiltIn: boolean
  rotate: boolean
  intervalSec: number
}

/** Which quote is on screen: a sequence of ids and a position in it. */
export interface QuoteCursor {
  order: string[]
  position: number
}

export const INTERVAL_OPTIONS = [
  { seconds: 15, label: '15 seconds' },
  { seconds: 30, label: '30 seconds' },
  { seconds: 60, label: '1 minute' },
  { seconds: 300, label: '5 minutes' },
  { seconds: 900, label: '15 minutes' },
  { seconds: 3600, label: '1 hour' },
]

/** Stable id for a built-in quote, so edits to the data file keep user choices. */
export function builtInId(text: string): string {
  let hash = 0
  for (const char of text)
    hash = (Math.imul(hash, 31) + char.codePointAt(0)!) | 0
  return `builtin-${(hash >>> 0).toString(36)}`
}

/**
 * Saved library + current built-in quotes: keeps the user's order and choices,
 * drops built-ins no longer in the data file and appends new ones at the end.
 */
export function mergeLibrary(
  saved: QuoteItem[] | null,
  builtIns: Quote[],
): QuoteItem[] {
  const current = builtIns.map((q): QuoteItem => ({
    id: builtInId(q.text),
    ...q,
    builtIn: true,
    enabled: true,
  }))
  if (!saved) return current
  const byId = new Map(current.map((item) => [item.id, item]))
  const kept = saved.flatMap((item) => {
    if (!item.builtIn) return [item]
    const fresh = byId.get(item.id)
    return fresh ? [{ ...fresh, enabled: item.enabled }] : []
  })
  const keptIds = new Set(kept.map((item) => item.id))
  return [...kept, ...current.filter((item) => !keptIds.has(item.id))]
}

/** Ids of the quotes in rotation, in arranged order. */
export function activeIds(library: QuoteLibrary): string[] {
  return library.items
    .filter((item) => item.enabled && (library.includeBuiltIn || !item.builtIn))
    .map((item) => item.id)
}

/** Fisher–Yates shuffle that never starts with `avoidFirst`. */
export function shuffled<T>(
  items: T[],
  random: () => number = Math.random,
  avoidFirst?: T,
): T[] {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  if (out.length > 1 && out[0] === avoidFirst)
    [out[0], out[1]] = [out[1], out[0]]
  return out
}

/**
 * Fits the cursor to the quotes in rotation, keeping the quote on screen when
 * it's still there. "My order" follows the arranged list; shuffle keeps its
 * sequence until the set of quotes changes.
 */
export function syncCursor(
  cursor: QuoteCursor | null,
  ids: string[],
  order: QuoteOrder,
  random: () => number = Math.random,
): QuoteCursor {
  if (ids.length === 0) return { order: [], position: 0 }
  const current = cursor?.order[cursor.position]
  if (order === 'custom') {
    return {
      order: ids,
      position: Math.max(current ? ids.indexOf(current) : -1, 0),
    }
  }
  const sameSet =
    cursor &&
    cursor.order.length === ids.length &&
    ids.every((id) => cursor.order.includes(id)) &&
    cursor.position >= 0 &&
    cursor.position < cursor.order.length
  if (sameSet) return cursor
  const sequence = shuffled(ids, random)
  if (current && sequence.includes(current)) {
    sequence.splice(sequence.indexOf(current), 1)
    sequence.unshift(current)
  }
  return { order: sequence, position: 0 }
}

/** Next quote: "My order" loops; shuffle reshuffles at the end without a repeat. */
export function advanceCursor(
  cursor: QuoteCursor,
  order: QuoteOrder,
  random: () => number = Math.random,
): QuoteCursor {
  if (cursor.order.length <= 1) return cursor
  if (cursor.position + 1 < cursor.order.length) {
    return { ...cursor, position: cursor.position + 1 }
  }
  if (order === 'custom') return { ...cursor, position: 0 }
  const current = cursor.order[cursor.position]
  return { order: shuffled(cursor.order, random, current), position: 0 }
}

/** Moves an item up (-1) or down (+1) in the arranged order. */
export function moveItem(
  items: QuoteItem[],
  id: string,
  delta: -1 | 1,
): QuoteItem[] {
  const from = items.findIndex((item) => item.id === id)
  const to = from + delta
  if (from === -1 || to < 0 || to >= items.length) return items
  const out = [...items]
  ;[out[from], out[to]] = [out[to], out[from]]
  return out
}
