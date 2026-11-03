import { addDays, daysBetween, type DateKey } from '../lib/date.ts'
import type { Todo } from '../types/todo.ts'

export interface TodoComparison {
  done: number
  total: number
  /** Done on the day before. */
  previousDay: number
  /** Average done per day over the 5 days before. */
  average5: number
}

function doneOn(todos: Todo[], date: DateKey): number {
  return todos.filter((todo) => todo.date === date && todo.done).length
}

export function todoComparison(todos: Todo[], date: DateKey): TodoComparison {
  const lastFive = Array.from({ length: 5 }, (_, i) => addDays(date, -(i + 1)))
  return {
    done: doneOn(todos, date),
    total: todos.filter((todo) => todo.date === date).length,
    previousDay: doneOn(todos, addDays(date, -1)),
    average5: lastFive.reduce((sum, day) => sum + doneOn(todos, day), 0) / 5,
  }
}

/**
 * Done per day from the first todo (at least 30 days, at most a year) to `today`,
 * with zero for days without any.
 */
export function doneSeries(
  todos: Todo[],
  today: DateKey,
): { start: DateKey; points: { date: DateKey; value: number }[] } {
  const first = todos.reduce(
    (min, todo) => (todo.date < min ? todo.date : min),
    today,
  )
  const days = Math.min(Math.max(daysBetween(first, today), 29), 364)
  const start = addDays(today, -days)
  const counts = new Map<DateKey, number>()
  for (const todo of todos) {
    if (todo.done) counts.set(todo.date, (counts.get(todo.date) ?? 0) + 1)
  }
  const points = Array.from({ length: days + 1 }, (_, i) => {
    const date = addDays(start, i)
    return { date, value: counts.get(date) ?? 0 }
  })
  return { start, points }
}
