import { addDays, daysBetween, toDateKey, type DateKey } from '../lib/date.ts'

export type Phase = 'focus' | 'short' | 'long'

export const PHASES: { phase: Phase; label: string }[] = [
  { phase: 'focus', label: 'Focus' },
  { phase: 'short', label: 'Short break' },
  { phase: 'long', label: 'Long break' },
]

export const phaseLabel = (phase: Phase) =>
  PHASES.find((p) => p.phase === phase)!.label

export interface PomodoroConfig {
  focusMin: number
  shortMin: number
  longMin: number
  /** A long break after this many focus sessions. */
  longEvery: number
  /** Start the next phase by itself when one ends. */
  autoStart: boolean
  /** A short chime when a phase ends. */
  sound: boolean
}

export const DEFAULT_CONFIG: PomodoroConfig = {
  focusMin: 25,
  shortMin: 5,
  longMin: 15,
  longEvery: 4,
  autoStart: false,
  sound: true,
}

export const CONFIG_LIMITS = {
  focusMin: [1, 120],
  shortMin: [1, 60],
  longMin: [1, 90],
  longEvery: [2, 12],
} as const satisfies Record<string, readonly [number, number]>

export interface TimerState {
  phase: Phase
  status: 'idle' | 'running' | 'paused'
  /** When the running phase ends (epoch ms). */
  endsAt: number | null
  /** Time left while idle or paused. */
  remainingMs: number
  /** Focus sessions finished in this set; resets after a long break. */
  completedFocus: number
  /** When the current focus phase was first started (for the session record). */
  startedAt: number | null
  taskId: string | null
  taskTitle: string | null
}

/** A finished focus phase, for the statistics. */
export interface FocusSession {
  id: string
  start: number
  end: number
  date: DateKey // local day it ended
  minutes: number
  taskId: string | null
  taskTitle: string | null
}

export function phaseMs(phase: Phase, config: PomodoroConfig): number {
  const minutes =
    phase === 'focus'
      ? config.focusMin
      : phase === 'short'
        ? config.shortMin
        : config.longMin
  return minutes * 60_000
}

export function idleTimer(
  phase: Phase,
  config: PomodoroConfig,
  keep: Partial<
    Pick<TimerState, 'completedFocus' | 'taskId' | 'taskTitle'>
  > = {},
): TimerState {
  return {
    phase,
    status: 'idle',
    endsAt: null,
    remainingMs: phaseMs(phase, config),
    completedFocus: keep.completedFocus ?? 0,
    startedAt: null,
    taskId: keep.taskId ?? null,
    taskTitle: keep.taskTitle ?? null,
  }
}

export function remainingMs(timer: TimerState, now: number): number {
  return timer.status === 'running' && timer.endsAt !== null
    ? Math.max(0, timer.endsAt - now)
    : timer.remainingMs
}

export function startTimer(timer: TimerState, now: number): TimerState {
  if (timer.status === 'running') return timer
  return {
    ...timer,
    status: 'running',
    endsAt: now + timer.remainingMs,
    startedAt: timer.startedAt ?? now,
  }
}

export function pauseTimer(timer: TimerState, now: number): TimerState {
  if (timer.status !== 'running') return timer
  return {
    ...timer,
    status: 'paused',
    endsAt: null,
    remainingMs: remainingMs(timer, now),
  }
}

export function resetTimer(
  timer: TimerState,
  config: PomodoroConfig,
): TimerState {
  return idleTimer(timer.phase, config, timer)
}

/** Which phase follows: a long break after every `longEvery` focus sessions. */
export function nextPhase(
  phase: Phase,
  completedFocus: number,
  config: PomodoroConfig,
): Phase {
  if (phase !== 'focus') return 'focus'
  return completedFocus > 0 && completedFocus % config.longEvery === 0
    ? 'long'
    : 'short'
}

function following(
  timer: TimerState,
  phase: Phase,
  completedFocus: number,
  config: PomodoroConfig,
  now: number,
): TimerState {
  const next = idleTimer(phase, config, { ...timer, completedFocus })
  return config.autoStart ? startTimer(next, now) : next
}

/** The phase ran out: record a focus session and move on. */
export function completePhase(
  timer: TimerState,
  config: PomodoroConfig,
  now: number,
  id: string = crypto.randomUUID(),
): { timer: TimerState; session: FocusSession | null } {
  if (timer.phase !== 'focus') {
    // A long break ends the set.
    const completed = timer.phase === 'long' ? 0 : timer.completedFocus
    return {
      timer: following(timer, 'focus', completed, config, now),
      session: null,
    }
  }
  const length = phaseMs('focus', config)
  const end = timer.endsAt ?? now
  const session: FocusSession = {
    id,
    start: timer.startedAt ?? end - length,
    end,
    date: toDateKey(new Date(end)),
    minutes: Math.round(length / 60_000),
    taskId: timer.taskId,
    taskTitle: timer.taskTitle,
  }
  const completed = timer.completedFocus + 1
  return {
    timer: following(
      timer,
      nextPhase('focus', completed, config),
      completed,
      config,
      now,
    ),
    session,
  }
}

/** Skip to the next phase without recording anything. */
export function skipPhase(
  timer: TimerState,
  config: PomodoroConfig,
): TimerState {
  if (timer.phase === 'focus') return idleTimer('short', config, timer)
  const completed = timer.phase === 'long' ? 0 : timer.completedFocus
  return idleTimer('focus', config, { ...timer, completedFocus: completed })
}

/** Config changed: an idle timer takes the new length straight away. */
export function applyConfig(
  timer: TimerState,
  config: PomodoroConfig,
): TimerState {
  return timer.status === 'idle'
    ? { ...timer, remainingMs: phaseMs(timer.phase, config) }
    : timer
}

/** Keeps a typed setting inside its limits; null if it isn't a number. */
export function clampSetting(
  key: keyof typeof CONFIG_LIMITS,
  value: number,
): number | null {
  if (!Number.isFinite(value)) return null
  const [min, max] = CONFIG_LIMITS[key]
  return Math.min(max, Math.max(min, Math.round(value)))
}

// Statistics

export type StatsRange = 'today' | '7d' | '30d' | 'all'

export const RANGE_LABELS: Record<StatsRange, string> = {
  today: 'Today',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  all: 'All time',
}

/** '' = every session, '\u0000none' = sessions without a task, else a task title. */
export const NO_TASK = '\u0000none'

export interface StatsFilter {
  range: StatsRange
  task: string
}

export function rangeStart(
  range: StatsRange,
  today: DateKey,
  sessions: FocusSession[],
): DateKey {
  if (range === 'today') return today
  if (range === '7d') return addDays(today, -6)
  if (range === '30d') return addDays(today, -29)
  return sessions.reduce((min, s) => (s.date < min ? s.date : min), today)
}

export function filterSessions(
  sessions: FocusSession[],
  filter: StatsFilter,
  today: DateKey,
): FocusSession[] {
  const from = rangeStart(filter.range, today, sessions)
  return sessions.filter(
    (s) =>
      s.date >= from &&
      s.date <= today &&
      (filter.task === '' ||
        (filter.task === NO_TASK ? !s.taskTitle : s.taskTitle === filter.task)),
  )
}

/**
 * Most days drawn in the chart (a year, like the todo chart). "All time" can
 * span far more, e.g. a session saved while the device clock was wrong.
 */
export const MAX_CHART_DAYS = 365

export interface StatsSummary {
  count: number
  minutes: number
  /** Average focus minutes per day over the whole range. */
  perDayAverage: number
  /** One point per day: the whole range, or its last `maxDays` days. */
  perDay: { date: DateKey; value: number }[]
  /** perDay doesn't reach back to the start of the range. */
  truncated: boolean
}

export function summarize(
  sessions: FocusSession[],
  from: DateKey,
  to: DateKey,
  maxDays = MAX_CHART_DAYS,
): StatsSummary {
  const days = daysBetween(from, to) + 1
  const chartDays = Math.min(days, maxDays)
  const chartFrom = addDays(to, -(chartDays - 1))
  const byDay = new Map<DateKey, number>()
  for (const s of sessions)
    byDay.set(s.date, (byDay.get(s.date) ?? 0) + s.minutes)
  const minutes = sessions.reduce((sum, s) => sum + s.minutes, 0)
  return {
    count: sessions.length,
    minutes,
    perDayAverage: minutes / days,
    perDay: Array.from({ length: chartDays }, (_, i) => {
      const date = addDays(chartFrom, i)
      return { date, value: byDay.get(date) ?? 0 }
    }),
    truncated: chartDays < days,
  }
}

/** Task titles seen in sessions, most used first. */
export function taskTitles(sessions: FocusSession[]): string[] {
  const counts = new Map<string, number>()
  for (const s of sessions)
    if (s.taskTitle) counts.set(s.taskTitle, (counts.get(s.taskTitle) ?? 0) + 1)
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([t]) => t)
}

/** '1h 15m', '45m', '0m' */
export function formatMinutes(total: number): string {
  const m = Math.round(total)
  const h = Math.floor(m / 60)
  return h ? `${h}h ${m % 60}m` : `${m}m`
}

/** '24:13' */
export function formatCountdown(ms: number): string {
  const seconds = Math.ceil(ms / 1000)
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
