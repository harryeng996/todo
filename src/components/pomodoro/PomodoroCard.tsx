import {
  BarChart3,
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
  Timer,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { DateKey } from '../../lib/date.ts'
import {
  formatCountdown,
  formatMinutes,
  phaseLabel,
  phaseMs,
  PHASES,
  remainingMs,
} from '../../state/pomodoro.ts'
import { usePomodoro } from '../../state/usePomodoro.ts'
import { useTodos } from '../../state/useTodos.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchProgress } from '../sketch/SketchProgress.tsx'

/** The current time, updated twice a second while `active`. */
function useNowWhile(active: boolean): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!active) return
    const interval = setInterval(() => setNow(Date.now()), 500)
    return () => clearInterval(interval)
  }, [active])
  return now
}

interface PomodoroCardProps {
  today: DateKey
  onShowStats: () => void
  onConfigure: () => void
}

const icon = { size: 18, strokeWidth: 1.75, 'aria-hidden': true } as const

export function PomodoroCard({
  today,
  onShowStats,
  onConfigure,
}: PomodoroCardProps) {
  const {
    config,
    timer,
    sessions,
    start,
    pause,
    reset,
    skip,
    switchPhase,
    setTask,
  } = usePomodoro()
  const { todos } = useTodos()
  const running = timer.status === 'running'
  const now = useNowWhile(running)
  const total = phaseMs(timer.phase, config)
  // `now` can be a moment old right after Start; never show more than the phase.
  const left = Math.min(remainingMs(timer, now), total)
  const countdown = formatCountdown(left)

  // Show the countdown in the tab title while it runs.
  const baseTitle = useRef(document.title)
  useEffect(() => {
    if (!running) return
    document.title = `${countdown} · ${phaseLabel(timer.phase)}`
  }, [running, countdown, timer.phase])
  useEffect(() => {
    const title = baseTitle.current
    if (!running) document.title = title
    return () => {
      document.title = title
    }
  }, [running])

  const todaySessions = sessions.filter((s) => s.date === today)
  const todayMinutes = todaySessions.reduce((sum, s) => sum + s.minutes, 0)
  const openTodos = todos.filter((t) => t.date === today && !t.done)
  const setPosition =
    timer.phase === 'focus' ? timer.completedFocus + 1 : timer.completedFocus

  return (
    <SketchBox seed={57} className="pomodoro">
      <header className="pomodoro__header">
        <h2 className="pomodoro__heading">
          <Timer size={20} strokeWidth={1.75} aria-hidden="true" /> Pomodoro
        </h2>
        <SketchButton
          variant="ghost"
          onClick={onShowStats}
          aria-label="Pomodoro statistics"
          title="Statistics"
        >
          <BarChart3 {...icon} />
        </SketchButton>
        <SketchButton
          variant="ghost"
          onClick={onConfigure}
          aria-label="Pomodoro settings"
          title="Pomodoro settings"
        >
          <SlidersHorizontal {...icon} />
        </SketchButton>
      </header>

      <div className="pomodoro__phases" role="group" aria-label="Phase">
        {PHASES.map(({ phase, label }) => (
          <button
            key={phase}
            type="button"
            className="pomodoro__phase"
            aria-pressed={timer.phase === phase}
            onClick={() => switchPhase(phase)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="pomodoro__clock">
        <time
          className="pomodoro__time"
          aria-label={`${phaseLabel(timer.phase)}: ${countdown} left`}
        >
          {[...countdown].map((char, i) => (
            <span
              key={i}
              className={char === ':' ? 'clock__colon' : 'clock__digit'}
            >
              {char}
            </span>
          ))}
        </time>
        <SketchProgress
          value={1 - left / total}
          label={`${phaseLabel(timer.phase)} progress`}
          seed={91}
        />
        <p className="pomodoro__cycle">
          {phaseLabel(timer.phase)} · {Math.min(setPosition, config.longEvery)}{' '}
          of {config.longEvery} before a long break
        </p>
      </div>

      {timer.phase === 'focus' && (
        <label className="pomodoro__task">
          Working on
          <select
            className="sketch-border--alt"
            value={timer.taskId ?? ''}
            onChange={(event) => {
              const todo = todos.find((t) => t.id === event.target.value)
              setTask(todo ? { id: todo.id, title: todo.title } : null)
            }}
          >
            <option value="">No task</option>
            {timer.taskId && !openTodos.some((t) => t.id === timer.taskId) && (
              <option value={timer.taskId}>{timer.taskTitle}</option>
            )}
            {openTodos.map((todo) => (
              <option key={todo.id} value={todo.id}>
                {todo.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="pomodoro__controls">
        <SketchButton variant="primary" onClick={running ? pause : start}>
          {running ? <Pause {...icon} /> : <Play {...icon} />}
          {running ? 'Pause' : timer.status === 'paused' ? 'Resume' : 'Start'}
        </SketchButton>
        <SketchButton
          variant="ghost"
          onClick={reset}
          aria-label="Reset"
          title="Reset"
        >
          <RotateCcw {...icon} />
        </SketchButton>
        <SketchButton
          variant="ghost"
          onClick={skip}
          aria-label="Skip to the next phase"
          title="Skip"
        >
          <SkipForward {...icon} />
        </SketchButton>
      </div>

      <p className="pomodoro__today">
        Today: {todaySessions.length}{' '}
        {todaySessions.length === 1 ? 'session' : 'sessions'} ·{' '}
        {formatMinutes(todayMinutes)} focused
      </p>
    </SketchBox>
  )
}
