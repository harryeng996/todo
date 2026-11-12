import { useSyncExternalStore } from 'react'
import { createJsonStore } from '../../../lib/storage.ts'

/** v2 only: a goal weight in kg (null when none is set). */
const store = createJsonStore<{ kg: number | null }>(
  'todoapp.v2.weightGoal.v1',
  () => ({ kg: null }),
)

const listeners = new Set<() => void>()
let cached: number | null | undefined

function read(): number | null {
  if (cached === undefined) {
    const kg = store.load().kg
    cached = typeof kg === 'number' && Number.isFinite(kg) ? kg : null
  }
  return cached
}

export function setWeightGoal(kg: number | null): void {
  cached = kg
  store.save({ kg })
  listeners.forEach((l) => l())
}

/** The goal weight in kg, shared by every card that shows it. */
export function useWeightGoal(): number | null {
  return useSyncExternalStore((l) => {
    listeners.add(l)
    return () => listeners.delete(l)
  }, read)
}
