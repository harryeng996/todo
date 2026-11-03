import { createContext, useContext } from 'react'
import type {
  FocusSession,
  Phase,
  PomodoroConfig,
  TimerState,
} from './pomodoro.ts'

export interface PomodoroContextValue {
  config: PomodoroConfig
  timer: TimerState
  sessions: FocusSession[]
  updateConfig: (patch: Partial<PomodoroConfig>) => void
  start: () => void
  pause: () => void
  reset: () => void
  skip: () => void
  switchPhase: (phase: Phase) => void
  setTask: (task: { id: string; title: string } | null) => void
  deleteSession: (id: string) => void
}

// Lives apart from <PomodoroProvider> so that file only exports components (fast refresh).
export const PomodoroContext = createContext<PomodoroContextValue | null>(null)

export function usePomodoro(): PomodoroContextValue {
  const value = useContext(PomodoroContext)
  if (!value)
    throw new Error('usePomodoro must be used inside <PomodoroProvider>')
  return value
}
