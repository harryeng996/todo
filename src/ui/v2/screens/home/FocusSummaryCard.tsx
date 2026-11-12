import { ArrowRight, Pause, Play, RotateCcw } from 'lucide-react'
import {
  formatCountdown,
  formatMinutes,
  phaseLabel,
  phaseMs,
  remainingMs,
} from '../../../../state/pomodoro.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { useToday } from '../../../../state/useToday.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { ProgressRing } from '../../components/ProgressRing.tsx'
import { navigate } from '../../lib/router.ts'
import { useNow } from '../../lib/useNow.ts'

export function FocusSummaryCard() {
  const today = useToday()
  const { timer, config, sessions, start, pause, reset } = usePomodoro()
  const running = timer.status === 'running'
  const now = useNow(1000, running)
  const left = remainingMs(timer, now.getTime())
  const total = phaseMs(timer.phase, config)
  const todays = sessions.filter((s) => s.date === today)
  const minutes = todays.reduce((sum, s) => sum + s.minutes, 0)
  const color = timer.phase === 'focus' ? 'var(--focus)' : 'var(--break)'

  return (
    <Card
      className="home-focus"
      title="Focus"
      subtitle={`${todays.length} ${todays.length === 1 ? 'session' : 'sessions'} · ${formatMinutes(minutes)} today`}
      action={
        <Button variant="ghost" size="sm" onClick={() => navigate('focus')}>
          Open <ArrowRight size={15} />
        </Button>
      }
    >
      <div className="home-focus__body">
        <ProgressRing
          value={1 - left / total}
          size={148}
          stroke={10}
          color={color}
          duration={running ? 0 : 0.9}
        >
          <span className="home-focus__time num">{formatCountdown(left)}</span>
          <span className="home-focus__phase" style={{ color }}>
            {phaseLabel(timer.phase)}
          </span>
        </ProgressRing>
        <div className="home-focus__side">
          <div
            className="cycle"
            aria-label={`${timer.completedFocus} of ${config.longEvery} focus sessions before a long break`}
          >
            {Array.from({ length: config.longEvery }, (_, i) => (
              <span
                key={i}
                className={`cycle__dot ${i < timer.completedFocus ? 'is-done' : ''}`}
              />
            ))}
          </div>
          <p className="home-focus__task">
            {timer.taskTitle ? (
              <>
                <span className="subtle">Working on</span> {timer.taskTitle}
              </>
            ) : (
              <span className="subtle">No task picked</span>
            )}
          </p>
          <div className="home-focus__controls">
            <Button
              variant="primary"
              icon={
                running ? (
                  <Pause size={16} fill="currentColor" />
                ) : (
                  <Play size={16} fill="currentColor" />
                )
              }
              onClick={running ? pause : start}
              style={{ background: color }}
            >
              {running
                ? 'Pause'
                : timer.status === 'paused'
                  ? 'Resume'
                  : 'Start'}
            </Button>
            {timer.status !== 'idle' && (
              <IconButton
                label="Reset timer"
                onClick={reset}
                variant="secondary"
              >
                <RotateCcw size={16} />
              </IconButton>
            )}
          </div>
        </div>
      </div>
    </Card>
  )
}
