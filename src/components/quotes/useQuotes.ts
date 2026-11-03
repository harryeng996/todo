import { useEffect, useState } from 'react'
import { createJsonStore } from '../../lib/storage.ts'
import type { Quote } from '../../data/quotes.ts'

export interface QuoteState {
  order: number[] // shuffled indexes into the quote list
  position: number // index into `order` of the quote on screen
}

const quoteStore = createJsonStore<QuoteState | null>(
  'todoapp.quotes.v1',
  () => null,
)

/** Fisher–Yates shuffle of 0..count-1, never starting with `avoidFirst`. */
export function shuffledOrder(
  count: number,
  random: () => number = Math.random,
  avoidFirst?: number,
): number[] {
  const order = Array.from({ length: count }, (_, i) => i)
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[order[i], order[j]] = [order[j], order[i]]
  }
  if (count > 1 && order[0] === avoidFirst)
    [order[0], order[1]] = [order[1], order[0]]
  return order
}

/** A saved state still fits the list (it may have been edited since). */
export function isValidState(state: QuoteState, count: number): boolean {
  const { order, position } = state
  return (
    Array.isArray(order) &&
    order.length === count &&
    new Set(order).size === count &&
    order.every((i) => Number.isInteger(i) && i >= 0 && i < count) &&
    Number.isInteger(position) &&
    position >= 0 &&
    position < count
  )
}

/** Next quote; after the last one, reshuffle without repeating the current quote. */
export function advance(
  state: QuoteState,
  random: () => number = Math.random,
): QuoteState {
  if (state.position + 1 < state.order.length) {
    return { ...state, position: state.position + 1 }
  }
  const current = state.order[state.position]
  return {
    order: shuffledOrder(state.order.length, random, current),
    position: 0,
  }
}

export function useQuotes(list: Quote[]) {
  const [state, setState] = useState<QuoteState>(() => {
    const saved = quoteStore.load()
    return saved && isValidState(saved, list.length)
      ? saved
      : { order: shuffledOrder(list.length), position: 0 }
  })

  useEffect(() => {
    quoteStore.save(state)
  }, [state])

  return {
    quote: list[state.order[state.position]],
    next: () => setState((current) => advance(current)),
  }
}
