import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { playChime } from '../lib/chime.ts'
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
const sessionStore = createJsonStore<FocusSession[]>(
  'todoapp.pomodoro.sessions.v1',
  () => [],
)

function load(): PomodoroState {
  const config = { ...DEFAULT_CONFIG, ...configStore.load() }
  return {
    config,
    // A running timer survives a reload: it counts from its stored end time.
    timer: timerStore.load() ?? idleTimer('focus', config),
    sessions: sessionStore.load(),
  }
}

/** Pomodoro timer, its settings and the finished focus sessions. */
export function PomodoroProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState(load)
  const soundOn = useRef(state.config.sound)

  useEffect(() => {
    soundOn.current = state.config.sound
    configStore.save(state.config)
    timerStore.save(state.timer)
    sessionStore.save(state.sessions)
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
