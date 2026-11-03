import { useEffect, useState } from 'react'
import {
  addDays,
  dayOfWeek,
  daysBetween,
  type DateKey,
} from '../../lib/date.ts'
import { createJsonStore } from '../../lib/storage.ts'

export type RangePreset = '1m' | '3m' | '6m' | '1y'

export type GridRange =
  { preset: RangePreset } | { preset: 'custom'; from: DateKey; to: DateKey }

/** Weeks shown by each preset, ending with the current week (like GitHub). */
export const PRESET_WEEKS: Record<RangePreset, number> = {
  '1m': 5,
  '3m': 13,
  '6m': 26,
  '1y': 53,
}

export const PRESET_LABELS: Record<RangePreset | 'custom', string> = {
  '1m': 'Last month',
  '3m': 'Last 3 months',
  '6m': 'Last 6 months',
  '1y': 'Last year',
  custom: 'Custom range…',
}

export const MAX_RANGE_DAYS = 371 // a year of weeks

export function resolveRange(
  range: GridRange,
  today: DateKey,
): { from: DateKey; to: DateKey } {
  if (range.preset === 'custom') return { from: range.from, to: range.to }
  const lastSunday = addDays(today, -dayOfWeek(today))
  return {
    from: addDays(lastSunday, -7 * (PRESET_WEEKS[range.preset] - 1)),
    to: today,
  }
}

/** An error message for a custom range, or null if it can be shown. */
export function rangeProblem(
  from: DateKey,
  to: DateKey,
  today: DateKey,
): string | null {
  if (!from || !to) return 'Pick both dates.'
  if (from > to) return 'The start must be on or before the end.'
  if (from > today) return 'The range has to start by today.'
  if (daysBetween(from, to) > MAX_RANGE_DAYS)
    return 'Pick a range of a year or less.'
  return null
}

const rangeStore = createJsonStore<GridRange>('todoapp.gridRange.v1', () => ({
  preset: '6m',
}))

/** The grid's date-range filter, remembered between visits. */
export function useGridRange() {
  const [range, setRange] = useState(() => rangeStore.load())
  useEffect(() => {
    rangeStore.save(range)
  }, [range])
  return [range, setRange] as const
}
