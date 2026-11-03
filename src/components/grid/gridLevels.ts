import type { DateKey } from '../../lib/date.ts'
import type { Todo } from '../../types/todo.ts'

export type Level = 0 | 1 | 2 | 3 | 4

/** Completed todos per day (unfinished ones don't count, like GitHub). */
export function doneCountsByDay(todos: Todo[]): Map<DateKey, number> {
  const counts = new Map<DateKey, number>()
  for (const todo of todos) {
    if (todo.done) counts.set(todo.date, (counts.get(todo.date) ?? 0) + 1)
  }
  return counts
}

/** 4 bands relative to the busiest day in range; 0 means nothing done. */
export function levelFor(done: number, maxDone: number): Level {
  if (done <= 0 || maxDone <= 0) return 0
  return Math.min(4, Math.ceil((4 * done) / maxDone)) as Level
}
