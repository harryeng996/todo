import { addDays, type DateKey } from './date.ts'

export type WeightUnit = 'kg' | 'lb'

export interface WeightEntry {
  kg: number | null
  hasPhoto: boolean
}

export type WeightLog = Record<DateKey, WeightEntry>

const LB_PER_KG = 2.2046226218
export const MIN_KG = 20
export const MAX_KG = 400

export function toUnit(kg: number, unit: WeightUnit): number {
  return unit === 'kg' ? kg : kg * LB_PER_KG
}

export function fromUnit(value: number, unit: WeightUnit): number {
  return unit === 'kg' ? value : value / LB_PER_KG
}

export function formatWeight(kg: number, unit: WeightUnit): string {
  return `${toUnit(kg, unit).toFixed(1)} ${unit}`
}

/** Parses what was typed ('72.4' or '72,4') in `unit`; null if it isn't a plausible weight. */
export function parseWeight(text: string, unit: WeightUnit): number | null {
  const value = Number(text.trim().replace(',', '.'))
  if (!text.trim() || !Number.isFinite(value)) return null
  const kg = fromUnit(value, unit)
  return kg >= MIN_KG && kg <= MAX_KG ? Math.round(kg * 100) / 100 : null
}

export interface ChartPoint {
  date: DateKey
  kg: number
}

/** Weigh-ins in the `days` days up to today, oldest first. */
export function chartPoints(
  log: WeightLog,
  today: DateKey,
  days = 90,
): ChartPoint[] {
  const first = addDays(today, -(days - 1))
  return Object.entries(log)
    .filter(
      ([date, entry]) => entry.kg !== null && date >= first && date <= today,
    )
    .map(([date, entry]) => ({ date, kg: entry.kg! }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
}

export interface WeightComparison {
  /** Latest weigh-in on or before the day asked about. */
  current: ChartPoint | null
  /** The weigh-in before `current`. */
  previous: ChartPoint | null
  /** Average of weigh-ins in the 10 days before `current` (null if none). */
  average10: number | null
}

export function weightComparison(
  log: WeightLog,
  date: DateKey,
): WeightComparison {
  const entries = Object.entries(log)
    .filter(([day, entry]) => entry.kg !== null && day <= date)
    .map(([day, entry]) => ({ date: day, kg: entry.kg! }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const current = entries.at(-1) ?? null
  const previous = entries.at(-2) ?? null
  if (!current) return { current, previous, average10: null }
  const from = addDays(current.date, -10)
  const window = entries.filter((e) => e.date >= from && e.date < current.date)
  const average10 = window.length
    ? window.reduce((sum, e) => sum + e.kg, 0) / window.length
    : null
  return { current, previous, average10 }
}
