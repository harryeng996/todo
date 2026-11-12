import { describe, expect, it } from 'vitest'
import type { Todo } from '../../../types/todo.ts'
import { buildSaverData, hm } from './saverData.ts'

const todo = (date: string, done: boolean): Todo => ({
  id: `${date}${Math.random()}`,
  title: 't',
  date,
  done,
  createdAt: '',
})

const base = {
  today: '2026-11-13',
  sessions: [],
  log: {},
  unit: 'kg' as const,
  weightTracking: false,
  pomodoro: true,
  quote: null,
  targets: [],
}

describe('screensaver data', () => {
  it('summarises tasks for today, the week and the streak', () => {
    const data = buildSaverData({
      ...base,
      todos: [
        todo('2026-11-13', true),
        todo('2026-11-13', false),
        todo('2026-11-12', true),
        todo('2026-11-11', true),
        todo('2026-11-02', true),
      ],
    })
    expect(data.tasks).toMatchObject({
      today: 2,
      doneToday: 1,
      done7: 3,
      donePrev7: 1,
      streak: 3,
    })
    expect(data.tasks.series7).toEqual([0, 0, 0, 0, 1, 1, 1])
    expect(data.weight).toBeNull()
  })

  it('picks the next target and the weight trend', () => {
    const data = buildSaverData({
      ...base,
      weightTracking: true,
      log: {
        '2026-10-01': { kg: 80, photos: [] },
        '2026-11-12': { kg: 78.5, photos: [] },
      },
      todos: [],
      targets: [
        {
          id: 'a',
          title: 'Old',
          startDate: '2026-01-01',
          endDate: '2026-02-01',
        },
        {
          id: 'b',
          title: 'Exam',
          startDate: '2026-11-01',
          endDate: '2026-11-23',
        },
      ],
    })
    expect(data.target).toMatchObject({ title: 'Exam', daysLeft: 10 })
    expect(data.weight).toMatchObject({ current: 78.5, change30: -1.5 })
  })

  it('formats minutes', () => {
    expect(hm(75)).toBe('1h 15m')
    expect(hm(40)).toBe('40m')
  })
})
