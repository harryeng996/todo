import { describe, expect, it } from 'vitest'
import type { Todo } from '../../../types/todo.ts'
import { niceTicks } from '../charts/scale.ts'
import { parseHash } from './router.ts'
import {
  daySeries,
  daysToGoal,
  goalProgress,
  greeting,
  minutesByHour,
  minutesByTask,
  movingAverage,
  streakOf,
  sumDays,
  taskTotals,
  weekdayAverages,
  weeklyRate,
} from './stats.ts'

const counts = (entries: Record<string, number>) =>
  new Map(Object.entries(entries))

describe('streakOf', () => {
  it('counts days in a row up to today', () => {
    const c = counts({ '2026-11-10': 1, '2026-11-11': 2, '2026-11-12': 1 })
    expect(streakOf(c, '2026-11-12')).toEqual({
      current: 3,
      best: 3,
      activeToday: true,
    })
  })

  it('keeps the streak alive while today is still empty', () => {
    const c = counts({ '2026-11-10': 1, '2026-11-11': 2 })
    expect(streakOf(c, '2026-11-12')).toMatchObject({
      current: 2,
      activeToday: false,
    })
  })

  it('breaks after a missed day and remembers the best run', () => {
    const c = counts({
      '2026-11-01': 1,
      '2026-11-02': 1,
      '2026-11-03': 1,
      '2026-11-04': 0,
      '2026-11-10': 1,
    })
    expect(streakOf(c, '2026-11-12')).toEqual({
      current: 0,
      best: 3,
      activeToday: false,
    })
  })

  it('crosses a DST change', () => {
    const c = counts({ '2026-10-24': 1, '2026-10-25': 1, '2026-10-26': 1 })
    expect(streakOf(c, '2026-10-26').current).toBe(3)
  })
})

describe('series and totals', () => {
  it('fills missing days with zero', () => {
    expect(
      daySeries(counts({ '2026-11-02': 4 }), '2026-11-01', '2026-11-03'),
    ).toEqual([
      { date: '2026-11-01', value: 0 },
      { date: '2026-11-02', value: 4 },
      { date: '2026-11-03', value: 0 },
    ])
  })

  it('sums the last n days', () => {
    expect(
      sumDays(
        counts({ '2026-11-01': 2, '2026-11-03': 3, '2026-10-01': 9 }),
        '2026-11-03',
        7,
      ),
    ).toBe(5)
  })

  it('computes the completion rate in range', () => {
    const todo = (date: string, done: boolean) =>
      ({ id: date + done, title: '', date, done, createdAt: '' }) as Todo
    const todos = [
      todo('2026-11-01', true),
      todo('2026-11-02', false),
      todo('2026-11-02', true),
      todo('2026-10-01', true),
    ]
    expect(taskTotals(todos, '2026-11-01', '2026-11-30')).toEqual({
      total: 3,
      done: 2,
      rate: 2 / 3,
    })
    expect(taskTotals([], '2026-11-01', '2026-11-30').rate).toBeNull()
  })

  it('averages by weekday, Monday first', () => {
    // 2026-11-09 is a Monday.
    const result = weekdayAverages(
      counts({ '2026-11-09': 4, '2026-11-02': 2 }),
      '2026-11-12',
      2,
    )
    expect(result[0]).toEqual({ weekday: 1, label: 'Mon', value: 3 })
    expect(result.map((r) => r.label)).toEqual([
      'Mon',
      'Tue',
      'Wed',
      'Thu',
      'Fri',
      'Sat',
      'Sun',
    ])
  })
})

describe('weight trends', () => {
  const points = [
    { date: '2026-11-01', value: 80 },
    { date: '2026-11-04', value: 79.4 },
    { date: '2026-11-08', value: 78.6 },
  ]

  it('averages over a trailing window of days', () => {
    const ma = movingAverage(points, 7)
    expect(ma[0].value).toBe(80)
    expect(ma[1].value).toBeCloseTo(79.7)
    expect(ma[2].value).toBeCloseTo(79) // 11-02..11-08: 79.4 and 78.6
  })

  it('fits a weekly rate', () => {
    expect(weeklyRate(points)).toBeCloseTo(-1.4, 1)
    expect(weeklyRate(points.slice(0, 1))).toBeNull()
  })
})

describe('helpers', () => {
  it('rounds chart ticks', () => {
    expect(niceTicks(0, 7, 3)).toEqual([0, 2.5, 5, 7.5])
    expect(niceTicks(78.6, 80, 4)).toEqual([78.5, 79, 79.5, 80])
  })

  it('parses routes', () => {
    expect(parseHash('')).toEqual({ screen: 'home' })
    expect(parseHash('#/tasks')).toEqual({ screen: 'tasks' })
    expect(parseHash('#/settings/quotes')).toEqual({
      screen: 'settings',
      section: 'quotes',
    })
    expect(parseHash('#/nope')).toEqual({ screen: 'home' })
  })

  it('greets by hour', () => {
    expect(greeting(8)).toBe('Good morning')
    expect(greeting(20)).toBe('Good evening')
  })
})

describe('focus breakdowns', () => {
  const at = (h: number, minutes: number, taskTitle: string | null) => ({
    id: `${h}${taskTitle}`,
    start: new Date(2026, 10, 12, h, 5).getTime(),
    end: new Date(2026, 10, 12, h, 30).getTime(),
    date: '2026-11-12',
    minutes,
    taskId: null,
    taskTitle,
  })

  it('buckets minutes by starting hour', () => {
    const hours = minutesByHour([
      at(9, 25, null),
      at(9, 25, 'A'),
      at(14, 50, 'B'),
    ])
    expect(hours[9]).toBe(50)
    expect(hours[14]).toBe(50)
    expect(hours.reduce((a, b) => a + b)).toBe(100)
  })

  it('totals by task, most time first', () => {
    expect(
      minutesByTask([at(9, 25, 'A'), at(10, 25, null), at(11, 25, 'A')]),
    ).toEqual([
      { title: 'A', minutes: 50, count: 2 },
      { title: 'No task', minutes: 25, count: 1 },
    ])
  })
})

describe('weight goal', () => {
  it('measures progress either way', () => {
    expect(goalProgress(80, 77, 74)).toBeCloseTo(0.5)
    expect(goalProgress(60, 63, 66)).toBeCloseTo(0.5)
    expect(goalProgress(80, 82, 74)).toBe(0) // moved away
    expect(goalProgress(80, 70, 74)).toBe(1) // past it
  })

  it('estimates the days left only when the trend heads there', () => {
    expect(daysToGoal(78, 74, -0.5)).toBe(56)
    expect(daysToGoal(78, 74, 0.5)).toBeNull()
    expect(daysToGoal(78, 74, null)).toBeNull()
    expect(daysToGoal(74.02, 74, -0.5)).toBe(0)
  })
})
