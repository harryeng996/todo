import { describe, expect, it } from 'vitest'
import type { Todo } from '../../../types/todo.ts'
import { buildPosterData, definitions, hm } from './posterData.ts'

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

describe('poster data', () => {
  it('summarises tasks for today, the week and the streak', () => {
    const data = buildPosterData({
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

  it('writes definitions only for what there is data for', () => {
    const data = buildPosterData({ ...base, todos: [todo('2026-11-13', true)] })
    expect(definitions(data).map((d) => d.word)).toEqual(['momentum'])

    const richer = buildPosterData({
      ...base,
      weightTracking: true,
      log: {
        '2026-10-01': { kg: 80, photos: [] },
        '2026-11-12': { kg: 78.5, photos: [] },
      },
      todos: [todo('2026-11-13', true), todo('2026-11-12', true)],
      targets: [
        {
          id: 't',
          title: 'Exam',
          startDate: '2026-11-01',
          endDate: '2026-11-23',
        },
      ],
    })
    const words = definitions(richer)
    expect(words.map((d) => d.word)).toEqual([
      'momentum',
      'streak',
      'progress',
      'deadline',
    ])
    expect(words[2].text).toContain('1.5 kg lighter')
    expect(words[3].text).toContain('10 days until “Exam”')
  })

  it('formats minutes', () => {
    expect(hm(75)).toBe('1h 15m')
    expect(hm(40)).toBe('40m')
  })
})
