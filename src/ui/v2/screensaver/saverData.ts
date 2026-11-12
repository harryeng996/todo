import { doneCountsByDay } from '../../../hooks/gridLevels.ts'
import { addDays, daysBetween, type DateKey } from '../../../lib/date.ts'
import { toUnit, type WeightLog, type WeightUnit } from '../../../lib/weight.ts'
import { countdownFor } from '../../../state/useTarget.ts'
import type { FocusSession } from '../../../state/pomodoro.ts'
import type { QuoteItem } from '../../../state/quoteLibrary.ts'
import type { Target } from '../../../types/target.ts'
import type { Todo } from '../../../types/todo.ts'
import {
  daySeries,
  focusMinutesByDay,
  streakOf,
  sumDays,
} from '../lib/stats.ts'

export interface SaverData {
  today: DateKey
  tasks: {
    today: number
    doneToday: number
    done7: number
    donePrev7: number
    /** Done per day, the last 14 days, oldest first. */
    series14: number[]
    /** Done per day, the last 7 days, oldest first. */
    series7: number[]
    byDay: Map<DateKey, number>
    streak: number
    bestStreak: number
  }
  focus: {
    enabled: boolean
    minutesToday: number
    sessionsToday: number
    /** Minutes per day, the last 7 days, oldest first. */
    series7: number[]
    minutes7: number
  }
  weight: {
    unit: WeightUnit
    current: number
    /** Change against the latest weigh-in at least 30 days old (null without one). */
    change30: number | null
    /** Weigh-ins in the last 60 days, oldest first. */
    series: number[]
  } | null
  quote: { text: string; author: string } | null
  target: { title: string; daysLeft: number; progress: number } | null
}

interface Input {
  today: DateKey
  todos: Todo[]
  sessions: FocusSession[]
  log: WeightLog
  unit: WeightUnit
  weightTracking: boolean
  pomodoro: boolean
  quote: QuoteItem | null
  targets: Target[]
}

export function buildSaverData(input: Input): SaverData {
  const { today, todos } = input
  const byDay = doneCountsByDay(todos)
  const todays = todos.filter((t) => t.date === today)
  const streak = streakOf(byDay, today)
  const focusByDay = focusMinutesByDay(input.sessions)
  const focus7 = daySeries(focusByDay, addDays(today, -6), today).map(
    (p) => p.value,
  )

  let weight: SaverData['weight'] = null
  if (input.weightTracking) {
    const points = Object.entries(input.log)
      .filter(([d, e]) => e.kg !== null && d <= today)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, e]) => ({ date, kg: e.kg! }))
    const latest = points.at(-1)
    if (latest) {
      const monthAgo = points
        .filter((p) => p.date <= addDays(today, -30))
        .at(-1)
      weight = {
        unit: input.unit,
        current: toUnit(latest.kg, input.unit),
        change30: monthAgo ? toUnit(latest.kg - monthAgo.kg, input.unit) : null,
        series: points
          .filter((p) => p.date > addDays(today, -60))
          .map((p) => toUnit(p.kg, input.unit)),
      }
    }
  }

  const upcoming = input.targets
    .filter((t) => t.endDate >= today)
    .sort((a, b) => (a.endDate < b.endDate ? -1 : 1))[0]

  return {
    today,
    tasks: {
      today: todays.length,
      doneToday: todays.filter((t) => t.done).length,
      done7: sumDays(byDay, today, 7),
      donePrev7: sumDays(byDay, addDays(today, -7), 7),
      series14: daySeries(byDay, addDays(today, -13), today).map(
        (p) => p.value,
      ),
      series7: daySeries(byDay, addDays(today, -6), today).map((p) => p.value),
      byDay,
      streak: streak.current,
      bestStreak: streak.best,
    },
    focus: {
      enabled: input.pomodoro,
      minutesToday: focusByDay.get(today) ?? 0,
      sessionsToday: input.sessions.filter((s) => s.date === today).length,
      series7: focus7,
      minutes7: focus7.reduce((a, b) => a + b, 0),
    },
    weight,
    quote: input.quote
      ? { text: input.quote.text, author: input.quote.author }
      : null,
    target: upcoming
      ? {
          title: upcoming.title,
          daysLeft: daysBetween(today, upcoming.endDate),
          progress: countdownFor(upcoming, today).progress,
        }
      : null,
  }
}

/** '1h 15m', '45m' */
export function hm(minutes: number): string {
  const m = Math.round(minutes)
  const h = Math.floor(m / 60)
  return h ? `${h}h ${m % 60}m` : `${m}m`
}
