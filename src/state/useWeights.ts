import { createContext, useContext } from 'react'
import type { DateKey } from '../lib/date.ts'
import type { WeightLog } from '../lib/weight.ts'

export interface WeightContextValue {
  log: WeightLog
  /** Bumped when a photo is replaced, so object URLs get reloaded. */
  photoVersion: number
  setWeight: (date: DateKey, kg: number | null) => void
  setPhoto: (date: DateKey, file: File) => Promise<void>
  removePhoto: (date: DateKey) => Promise<void>
  /** Removes the day's weight and photo. */
  deleteEntry: (date: DateKey) => Promise<void>
}

// Lives apart from <WeightProvider> so that file only exports components (fast refresh).
export const WeightContext = createContext<WeightContextValue | null>(null)

export function useWeights(): WeightContextValue {
  const value = useContext(WeightContext)
  if (!value) throw new Error('useWeights must be used inside <WeightProvider>')
  return value
}
