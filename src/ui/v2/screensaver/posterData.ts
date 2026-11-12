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

export interface PosterData {
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

export function buildPosterData(input: Input): PosterData {
  const { today, todos } = input
  const byDay = doneCountsByDay(todos)
  const todays = todos.filter((t) => t.date === today)
  const streak = streakOf(byDay, today)
  const focusByDay = focusMinutesByDay(input.sessions)
  const focus7 = daySeries(focusByDay, addDays(today, -6), today).map(
    (p) => p.value,
  )

  let weight: PosterData['weight'] = null
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

export interface Definition {
  word: string
  phonetic: string
  kind: string
  text: string
  chart: 'heatmap' | 'focus' | 'weight' | 'tasks'
}

const plural = (n: number, one: string, many = `${one}s`) =>
  `${n} ${n === 1 ? one : many}`

/** Dictionary-style entries written from the data; the poster cycles through them. */
export function definitions(data: PosterData): Definition[] {
  const { tasks, focus, weight, target } = data
  const list: Definition[] = []
  const diff = tasks.done7 - tasks.donePrev7
  list.push({
    word: 'momentum',
    phonetic: 'mo·men·tum',
    kind: 'noun',
    text:
      tasks.done7 > 0
        ? `the quiet force of ${plural(tasks.done7, 'task')} finished in the last seven days${
            diff > 0
              ? `, ${diff} more than the week before`
              : diff < 0
                ? `, ${-diff} fewer than the week before`
                : ''
          }. one small push keeps it going.`
        : 'what the first finished task of the week starts. it only needs one.',
    chart: 'tasks',
  })
  if (tasks.streak >= 2)
    list.push({
      word: 'streak',
      phonetic: 'strēk',
      kind: 'noun',
      text: `${plural(tasks.streak, 'day')} in a row of getting at least one thing done${
        tasks.bestStreak > tasks.streak
          ? `. the best run so far: ${tasks.bestStreak}`
          : '. the longest run yet'
      }.`,
      chart: 'heatmap',
    })
  if (focus.enabled && focus.minutes7 > 0)
    list.push({
      word: 'focus',
      phonetic: 'fō·kəs',
      kind: 'noun',
      text: `${hm(focus.minutes7)} given to one thing at a time this week. today: ${hm(focus.minutesToday)} across ${plural(focus.sessionsToday, 'session')}.`,
      chart: 'focus',
    })
  if (weight)
    list.push({
      word: 'progress',
      phonetic: 'prog·ress',
      kind: 'noun',
      text:
        weight.change30 === null
          ? `${weight.current.toFixed(1)} ${weight.unit} at the last weigh-in. every entry makes the line clearer.`
          : `${weight.current.toFixed(1)} ${weight.unit} today, ${Math.abs(weight.change30).toFixed(1)} ${weight.unit} ${
              weight.change30 <= 0 ? 'lighter' : 'heavier'
            } than a month ago. measured, not guessed.`,
      chart: 'weight',
    })
  if (target && target.daysLeft > 0)
    list.push({
      word: 'deadline',
      phonetic: 'ded·līn',
      kind: 'noun',
      text: `${plural(target.daysLeft, 'day')} until “${target.title}”. ${Math.round(target.progress * 100)}% of the time has passed; the rest is still yours.`,
      chart: 'heatmap',
    })
  return list
}

/** Short hand-lettered sayings for the sketch poster (original lines). */
export const SAYINGS = [
  ['ONE THING', 'AT A TIME,', 'THEN THE NEXT'],
  ['SMALL STEPS', 'STILL MOVE', 'YOU FORWARD'],
  ['COFFEE FIRST,', 'THEN THE', 'LIST'],
  ['DONE IS A', 'NICE PLACE', 'TO BE'],
] as const
