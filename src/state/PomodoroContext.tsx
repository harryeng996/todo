import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { playChime } from '../lib/chime.ts'
import { createRecordStore } from '../lib/recordStore.ts'
import { createJsonStore } from '../lib/storage.ts'
import {
  applyConfig,
  completePhase,
  DEFAULT_CONFIG,
  idleTimer,
  pauseTimer,
  resetTimer,
  skipPhase,
  startTimer,
  type FocusSession,
  type PomodoroConfig,
  type TimerState,
} from './pomodoro.ts'
import { PomodoroContext, type PomodoroContextValue } from './usePomodoro.ts'

interface PomodoroState {
  config: PomodoroConfig
  timer: TimerState
  sessions: FocusSession[]
}

const configStore = createJsonStore<Partial<PomodoroConfig>>(
  'todoapp.pomodoro.config.v1',
  () => ({}),
)
const timerStore = createJsonStore<TimerState | null>(
  'todoapp.pomodoro.timer.v1',
  () => null,
)
const SESSIONS_V1 = 'todoapp.pomodoro.sessions.v1'

/** Finished sessions grow every day: IndexedDB, one record each, oldest first. */
const sessionRecords = createRecordStore<FocusSession>({
  dbName: 'todoapp-focus-sessions',
  legacy: createJsonStore<FocusSession[]>(SESSIONS_V1, () => []),
  legacyKeys: [SESSIONS_V1],
  compare: (a, b) => a.end - b.end,
})

function load(sessions: FocusSession[]): PomodoroState {
  const config = { ...DEFAULT_CONFIG, ...configStore.load() }
  return {
    config,
    // A running timer survives a reload: it counts from its stored end time.
    timer: timerStore.load() ?? idleTimer('focus', config),
    sessions,
  }
}

/** Pomodoro timer, its settings and the finished focus sessions. */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useState(
    () => sessionRecords.loadNow() ?? null,
  )

  useEffect(() => {
    if (sessions) return
    let cancelled = false
    void sessionRecords.load().then((loaded) => {
      if (!cancelled) setSessions(loaded)
    })
    return () => {
      cancelled = true
    }
  }, [sessions])

  // Wait for the sessions, so a phase that ended while the page was closed is
  // added to the full list rather than to an empty one.
  if (!sessions) return null
  return <LoadedPomodoro sessions={sessions}>{children}</LoadedPomodoro>
}

function LoadedPomodoro({
  sessions,
  children,
}: {
  sessions: FocusSession[]
  children: ReactNode
}) {
  const [state, setState] = useState(() => load(sessions))
  const soundOn = useRef(state.config.sound)
  const savedSessions = useRef(sessions)

  useEffect(() => {
    soundOn.current = state.config.sound
    configStore.save(state.config)
    timerStore.save(state.timer)
    // Only new or deleted sessions are written.
    void sessionRecords.sync(savedSessions.current, state.sessions)
    savedSessions.current = state.sessions
  }, [state])

  // Finish the phase exactly when it runs out (straight away if that happened
  // while the page was closed). No per-second updates needed here.
  const { status, endsAt } = state.timer
  useEffect(() => {
    if (status !== 'running' || endsAt === null) return
    const timeout = setTimeout(
      () => {
        setState((s) => {
          if (s.timer.status !== 'running') return s
          const { timer, session } = completePhase(
            s.timer,
            s.config,
            Date.now(),
          )
          return {
            ...s,
            timer,
            sessions: session ? [...s.sessions, session] : s.sessions,
          }
        })
        if (soundOn.current) playChime()
      },
      Math.max(0, endsAt - Date.now()),
    )
    return () => clearTimeout(timeout)
  }, [status, endsAt])

  const value = useMemo((): PomodoroContextValue => {
    const update = (change: (s: PomodoroState) => PomodoroState) =>
      setState(change)
    const withTimer = (
      change: (timer: TimerState, s: PomodoroState) => TimerState,
    ) => update((s) => ({ ...s, timer: change(s.timer, s) }))
    return {
      ...state,
      updateConfig: (patch) =>
        update((s) => {
          const config = { ...s.config, ...patch }
          return { ...s, config, timer: applyConfig(s.timer, config) }
        }),
      start: () => withTimer((timer) => startTimer(timer, Date.now())),
      pause: () => withTimer((timer) => pauseTimer(timer, Date.now())),
      reset: () => withTimer((timer, s) => resetTimer(timer, s.config)),
      skip: () => withTimer((timer, s) => skipPhase(timer, s.config)),
      switchPhase: (phase) =>
        withTimer((timer, s) =>
          phase === timer.phase && timer.status === 'idle'
            ? timer
            : idleTimer(phase, s.config, timer),
        ),
      setTask: (task) =>
        withTimer((timer) => ({
          ...timer,
          taskId: task?.id ?? null,
          taskTitle: task?.title ?? null,
        })),
      deleteSession: (id) =>
        update((s) => ({
          ...s,
          sessions: s.sessions.filter((x) => x.id !== id),
        })),
    }
  }, [state])

  return <PomodoroContext value={value}>{children}</PomodoroContext>
}
