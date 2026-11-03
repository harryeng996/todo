import { describe, expect, it } from 'vitest'
import { createTodo } from '../../state/todoReducer.ts'
import { doneCountsByDay, levelFor } from './gridLevels.ts'

describe('levelFor', () => {
  it('is 0 when nothing was done', () => {
    expect(levelFor(0, 8)).toBe(0)
    expect(levelFor(0, 0)).toBe(0)
  })

  it('splits into 4 bands relative to the busiest day', () => {
    expect(levelFor(1, 8)).toBe(1)
    expect(levelFor(2, 8)).toBe(1)
    expect(levelFor(3, 8)).toBe(2)
    expect(levelFor(4, 8)).toBe(2)
    expect(levelFor(6, 8)).toBe(3)
    expect(levelFor(7, 8)).toBe(4)
    expect(levelFor(8, 8)).toBe(4)
  })

  it('gives the busiest day the top level even with one todo', () => {
    expect(levelFor(1, 1)).toBe(4)
  })
})

describe('doneCountsByDay', () => {
  it('counts only completed todos, per day', () => {
    const todos = [
      { ...createTodo('a', '2026-11-01'), done: true },
      { ...createTodo('b', '2026-11-01'), done: true },
      createTodo('c', '2026-11-01'),
      { ...createTodo('d', '2026-11-02'), done: true },
      createTodo('e', '2026-11-03'),
    ]
    expect(Object.fromEntries(doneCountsByDay(todos))).toEqual({
      '2026-11-01': 2,
      '2026-11-02': 1,
    })
  })
})
