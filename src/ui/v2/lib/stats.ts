import {
  addDays,
  dayOfWeek,
  daysBetween,
  type DateKey,
} from '../../../lib/date.ts'
import type { FocusSession } from '../../../state/pomodoro.ts'
import type { Todo } from '../../../types/todo.ts'

export interface DayValue {
  date: DateKey
  value: number
}

/** One point per day from `from` to `to`, zero where the map has nothing. */
export function daySeries(
  counts: Map<DateKey, number>,
  from: DateKey,
  to: DateKey,
): DayValue[] {
  const days = daysBetween(from, to) + 1
  return Array.from({ length: Math.max(days, 0) }, (_, i) => {
    const date = addDays(from, i)
    return { date, value: counts.get(date) ?? 0 }
  })
}

export interface Streak {
  /** Days in a row with activity, ending today (or yesterday while today is still open). */
  current: number
  best: number
  activeToday: boolean
}

export function streakOf(counts: Map<DateKey, number>, today: DateKey): Streak {
  const active = (d: DateKey) => (counts.get(d) ?? 0) > 0
  const activeToday = active(today)
  let current = 0
  for (
    let d = activeToday ? today : addDays(today, -1);
    active(d);
    d = addDays(d, -1)
  )
    current++

  const days = [...counts.keys()].filter((d) => d <= today && active(d)).sort()
  let best = 0
  let run = 0
  let previous: DateKey | null = null
  for (const d of days) {
    run = previous && daysBetween(previous, d) === 1 ? run + 1 : 1
    best = Math.max(best, run)
    previous = d
  }
  return { current, best: Math.max(best, current), activeToday }
}

export interface TaskTotals {
  total: number
  done: number
  /** 0..1, or null without tasks. */
  rate: number | null
}

export function taskTotals(
  todos: Todo[],
  from: DateKey,
  to: DateKey,
): TaskTotals {
  let total = 0
  let done = 0
  for (const t of todos) {
    if (t.date < from || t.date > to) continue
    total++
    if (t.done) done++
  }
  return { total, done, rate: total ? done / total : null }
}

/** Average per weekday (Mon first) over the `weeks` weeks before and including today. */
export function weekdayAverages(
  counts: Map<DateKey, number>,
  today: DateKey,
  weeks = 8,
): { weekday: number; label: string; value: number }[] {
  const sums = Array(7).fill(0)
  const seen = Array(7).fill(0)
  for (let i = 0; i < weeks * 7; i++) {
    const d = addDays(today, -i)
    const wd = dayOfWeek(d)
    sums[wd] += counts.get(d) ?? 0
    seen[wd]++
  }
  const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return [1, 2, 3, 4, 5, 6, 0].map((wd) => ({
    weekday: wd,
    label: labels[wd],
    value: seen[wd] ? sums[wd] / seen[wd] : 0,
  }))
}

export function average(values: readonly number[]): number | null {
  return values.length
    ? values.reduce((a, b) => a + b, 0) / values.length
    : null
}

/** Sum of the map's values over the `days` days ending on `to`. */
export function sumDays(
  counts: Map<DateKey, number>,
  to: DateKey,
  days: number,
): number {
  let sum = 0
  for (let i = 0; i < days; i++) sum += counts.get(addDays(to, -i)) ?? 0
  return sum
}

export function focusMinutesByDay(
  sessions: readonly FocusSession[],
): Map<DateKey, number> {
  const map = new Map<DateKey, number>()
  for (const s of sessions) map.set(s.date, (map.get(s.date) ?? 0) + s.minutes)
  return map
}

export function focusCountByDay(
  sessions: readonly FocusSession[],
): Map<DateKey, number> {
  const map = new Map<DateKey, number>()
  for (const s of sessions) map.set(s.date, (map.get(s.date) ?? 0) + 1)
  return map
}

/** For each point, the mean of points within the `window` days ending on it. */
export function movingAverage(
  points: readonly DayValue[],
  window = 7,
): DayValue[] {
  return points.map((p) => {
    const from = addDays(p.date, -(window - 1))
    const inWindow = points.filter((q) => q.date >= from && q.date <= p.date)
    return { date: p.date, value: average(inWindow.map((q) => q.value))! }
  })
}

/** Least-squares slope in value per week, or null with fewer than two days. */
export function weeklyRate(points: readonly DayValue[]): number | null {
  if (points.length < 2) return null
  const first = points[0].date
  const xs = points.map((p) => daysBetween(first, p.date))
  if (xs.at(-1) === 0) return null
  const mx = average(xs)!
  const my = average(points.map((p) => p.value))!
  let num = 0
  let den = 0
  points.forEach((p, i) => {
    num += (xs[i] - mx) * (p.value - my)
    den += (xs[i] - mx) ** 2
  })
  return den ? (num / den) * 7 : null
}

/** 'Good morning' etc. by local hour. */
export function greeting(hour: number): string {
  if (hour < 5) return 'Good night'
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/** Focus minutes by the hour each session started (0–23), local time. */
export function minutesByHour(sessions: readonly FocusSession[]): number[] {
  const hours = Array<number>(24).fill(0)
  for (const s of sessions) hours[new Date(s.start).getHours()] += s.minutes
  return hours
}

export interface TaskShare {
  title: string
  minutes: number
  count: number
}

/** Focus time per task (sessions without one are grouped), most first. */
export function minutesByTask(
  sessions: readonly FocusSession[],
  noTask = 'No task',
): TaskShare[] {
  const map = new Map<string, TaskShare>()
  for (const s of sessions) {
    const title = s.taskTitle || noTask
    const entry = map.get(title) ?? { title, minutes: 0, count: 0 }
    entry.minutes += s.minutes
    entry.count++
    map.set(title, entry)
  }
  return [...map.values()].sort(
    (a, b) => b.minutes - a.minutes || a.title.localeCompare(b.title),
  )
}
