import { createContext, useContext } from 'react'
import type { DateKey } from '../lib/date.ts'
import type { PhotoKey, WeightLog } from '../lib/weight.ts'

export interface WeightContextValue {
  log: WeightLog
  setWeight: (date: DateKey, kg: number | null) => void
  /** Resizes and stores the photo, then adds it to the day; resolves to its key. */
  addPhoto: (date: DateKey, file: File) => Promise<PhotoKey>
  /** Swaps one photo for a new one in the same place; resolves to its key. */
  replacePhoto: (date: DateKey, old: PhotoKey, file: File) => Promise<PhotoKey>
  removePhoto: (date: DateKey, key: PhotoKey) => Promise<void>
  removeAllPhotos: (date: DateKey) => Promise<void>
  /** Removes the day's weight and photos. */
  deleteEntry: (date: DateKey) => Promise<void>
}

// Lives apart from <WeightProvider> so that file only exports components (fast refresh).
export const WeightContext = createContext<WeightContextValue | null>(null)

export function useWeights(): WeightContextValue {
  const value = useContext(WeightContext)
  if (!value) throw new Error('useWeights must be used inside <WeightProvider>')
  return value
}
