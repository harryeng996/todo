import type { DateKey } from '../lib/date.ts'

export interface Target {
  id: string
  title: string
  startDate: DateKey
  endDate: DateKey // final day, inclusive
}

/** What the target form edits (the id is assigned by the list). */
export type TargetFields = Omit<Target, 'id'>
