import { describe, expect, it } from 'vitest'
import { createTodo } from './todoReducer.ts'
import { doneSeries, todoComparison } from './todoStats.ts'

const done = (date: string) => ({ ...createTodo('x', date), done: true })

describe('todoComparison', () => {
  it('compares a day with the day before and the 5 days before', () => {
    const todos = [
      done('2026-11-03'),
      done('2026-11-03'),
      createTodo('open', '2026-11-03'),
      done('2026-11-02'),
      done('2026-10-30'),
      done('2026-10-30'),
      done('2026-10-28'), // 6 days before: outside the window
    ]
    expect(todoComparison(todos, '2026-11-03')).toEqual({
      done: 2,
      total: 3,
      previousDay: 1,
      average5: 0.6, // (1 + 2) / 5
    })
  })
})

describe('doneSeries', () => {
  it('has one point per day up to today, zero when nothing was done', () => {
    const { start, points } = doneSeries([done('2026-11-01')], '2026-11-03')
    expect(start).toBe('2026-10-05') // at least 30 days
    expect(points).toHaveLength(30)
    expect(points.at(-3)).toEqual({ date: '2026-11-01', value: 1 })
    expect(points.at(-1)).toEqual({ date: '2026-11-03', value: 0 })
  })
})
