import { describe, expect, it } from 'vitest'
import {
  DEFAULT_CONFIG,
  NO_TASK,
  clampSetting,
  completePhase,
  filterSessions,
  formatCountdown,
  formatMinutes,
  idleTimer,
  nextPhase,
  pauseTimer,
  remainingMs,
  skipPhase,
  startTimer,
  summarize,
  taskTitles,
  type FocusSession,
} from './pomodoro.ts'

const config = DEFAULT_CONFIG // 25 / 5 / 15, long break every 4
const MIN = 60_000

describe('timer', () => {
  it('starts, counts down from an end time, pauses and resumes', () => {
    const idle = idleTimer('focus', config)
    expect(remainingMs(idle, 0)).toBe(25 * MIN)
    const running = startTimer(idle, 1_000)
    expect(running.endsAt).toBe(1_000 + 25 * MIN)
    expect(remainingMs(running, 1_000 + 10 * MIN)).toBe(15 * MIN)
    const paused = pauseTimer(running, 1_000 + 10 * MIN)
    expect(paused).toMatchObject({
      status: 'paused',
      remainingMs: 15 * MIN,
      endsAt: null,
    })
    const resumed = startTimer(paused, 50 * MIN)
    expect(resumed.endsAt).toBe(65 * MIN)
    expect(resumed.startedAt).toBe(1_000) // first start is kept for the record
  })

  it('takes a long break after every 4 focus sessions', () => {
    expect(
      [1, 2, 3, 4, 5, 8].map((n) => nextPhase('focus', n, config)),
    ).toEqual(['short', 'short', 'short', 'long', 'short', 'long'])
    expect(nextPhase('short', 1, config)).toBe('focus')
  })
})

describe('completePhase', () => {
  it('records a finished focus session with its task, then a break', () => {
    const timer = {
      ...startTimer(idleTimer('focus', config), 0),
      taskId: 't1',
      taskTitle: 'Write chapter 3',
    }
    const { timer: next, session } = completePhase(
      timer,
      config,
      25 * MIN,
      's1',
    )
    expect(session).toMatchObject({
      id: 's1',
      start: 0,
      end: 25 * MIN,
      minutes: 25,
      taskTitle: 'Write chapter 3',
    })
    expect(next).toMatchObject({
      phase: 'short',
      status: 'idle',
      completedFocus: 1,
      taskTitle: 'Write chapter 3',
    })
  })

  it('goes to a long break after the 4th, and the long break ends the set', () => {
    const fourth = { ...idleTimer('focus', config), completedFocus: 3 }
    const afterFocus = completePhase(fourth, config, 0).timer
    expect(afterFocus).toMatchObject({ phase: 'long', completedFocus: 4 })
    const afterLong = completePhase(afterFocus, config, 0)
    expect(afterLong.session).toBeNull()
    expect(afterLong.timer).toMatchObject({ phase: 'focus', completedFocus: 0 })
  })

  it('starts the next phase by itself when auto-start is on', () => {
    const auto = { ...config, autoStart: true }
    const { timer } = completePhase(
      startTimer(idleTimer('focus', auto), 0),
      auto,
      25 * MIN,
    )
    expect(timer).toMatchObject({
      phase: 'short',
      status: 'running',
      endsAt: 30 * MIN,
    })
  })

  it('skipping records nothing', () => {
    expect(skipPhase(idleTimer('focus', config), config)).toMatchObject({
      phase: 'short',
      completedFocus: 0,
    })
    expect(
      skipPhase({ ...idleTimer('long', config), completedFocus: 4 }, config),
    ).toMatchObject({
      phase: 'focus',
      completedFocus: 0,
    })
  })
})

describe('statistics', () => {
  const session = (
    date: string,
    minutes: number,
    taskTitle: string | null = null,
  ): FocusSession => ({
    id: `${date}-${taskTitle}`,
    start: 0,
    end: 0,
    date,
    minutes,
    taskId: null,
    taskTitle,
  })
  const today = '2026-11-04'
  const sessions = [
    session('2026-11-04', 25, 'Thesis'),
    session('2026-11-04', 25),
    session('2026-11-02', 50, 'Thesis'),
    session('2026-10-20', 25, 'Reading'),
    session('2026-09-01', 25, 'Thesis'),
  ]

  it('filters by date range and task', () => {
    expect(
      filterSessions(sessions, { range: 'today', task: '' }, today),
    ).toHaveLength(2)
    expect(
      filterSessions(sessions, { range: '7d', task: 'Thesis' }, today),
    ).toHaveLength(2)
    expect(
      filterSessions(sessions, { range: '30d', task: '' }, today),
    ).toHaveLength(4)
    expect(
      filterSessions(sessions, { range: 'all', task: NO_TASK }, today),
    ).toHaveLength(1)
    expect(
      filterSessions(sessions, { range: 'all', task: '' }, today),
    ).toHaveLength(5)
  })

  it('totals focus time and spreads it per day', () => {
    const week = filterSessions(sessions, { range: '7d', task: '' }, today)
    const summary = summarize(week, '2026-10-29', today)
    expect(summary).toMatchObject({ count: 3, minutes: 100 })
    expect(summary.perDayAverage).toBeCloseTo(100 / 7)
    expect(summary.perDay).toHaveLength(7)
    expect(summary.perDay.at(-1)).toEqual({ date: today, value: 50 })
    expect(summary.perDay.at(-3)).toEqual({ date: '2026-11-02', value: 50 })
  })

  it('lists task titles by use', () => {
    expect(taskTitles(sessions)).toEqual(['Thesis', 'Reading'])
  })
})

describe('formatting and limits', () => {
  it('formats durations', () => {
    expect(formatMinutes(75)).toBe('1h 15m')
    expect(formatMinutes(45)).toBe('45m')
    expect(formatCountdown(25 * MIN)).toBe('25:00')
    expect(formatCountdown(61_001)).toBe('01:02')
  })

  it('keeps settings within limits', () => {
    expect(clampSetting('focusMin', 0)).toBe(1)
    expect(clampSetting('focusMin', 500)).toBe(120)
    expect(clampSetting('longEvery', 3.6)).toBe(4)
    expect(clampSetting('shortMin', Number.NaN)).toBeNull()
  })
})
