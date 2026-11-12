import {
  Pause,
  Play,
  RotateCcw,
  SkipForward,
  SlidersHorizontal,
} from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
  formatCountdown,
  phaseLabel,
  phaseMs,
  PHASES,
  remainingMs,
} from '../../../../state/pomodoro.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { useTodos } from '../../../../state/useTodos.ts'
import { useToday } from '../../../../state/useToday.ts'
import { useWidth } from '../../charts/useWidth.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { FlipText } from '../../components/FlipText.tsx'
import { ProgressRing } from '../../components/ProgressRing.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { riseIn } from '../../lib/motion.ts'
import { phaseColor } from '../../lib/phase.ts'
import { navigate } from '../../lib/router.ts'
import { useNow } from '../../lib/useNow.ts'

/** The big timer: phase switcher, ring, controls and the task being worked on. */
export function TimerStage() {
  const today = useToday()
  const { todos } = useTodos()
  const { config, timer, start, pause, reset, skip, switchPhase, setTask } =
    usePomodoro()
  const running = timer.status === 'running'
  const now = useNow(1000, running)
  const total = phaseMs(timer.phase, config)
  const left = Math.min(remainingMs(timer, now.getTime()), total)
  const color = phaseColor(timer.phase)
  const [ref, width] = useWidth<HTMLDivElement>(400)
  const size = Math.min(320, Math.max(220, width - 48))
  const position = Math.min(
    timer.phase === 'focus' ? timer.completedFocus + 1 : timer.completedFocus,
    config.longEvery,
  )
  const openTodos = todos.filter((t) => t.date === today && !t.done)

  return (
    <motion.section
      ref={ref}
      variants={riseIn}
      className={`card stage ${running ? 'is-running' : ''}`}
      style={{ ['--phase' as string]: color }}
      aria-label="Pomodoro timer"
    >
      <div className="stage__glow" aria-hidden="true" />
      <div className="stage__top">
        <Segmented
          label="Phase"
          value={timer.phase}
          onChange={switchPhase}
          options={PHASES.map(({ phase, label }) => ({ value: phase, label }))}
        />
      </div>

      <div className="stage__ring">
        <ProgressRing
          value={1 - left / total}
          size={size}
          stroke={12}
          color={color}
          track="color-mix(in srgb, var(--phase) 14%, var(--surface-2))"
          duration={running ? 0 : 0.9}
          label={`${phaseLabel(timer.phase)}: ${formatCountdown(left)} left`}
        >
          <span className="stage__time num">
            <FlipText value={formatCountdown(left)} />
          </span>
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={timer.phase}
              className="stage__phase"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {phaseLabel(timer.phase)} · {position}/{config.longEvery}
            </motion.span>
          </AnimatePresence>
        </ProgressRing>
      </div>

      <div className="stage__controls">
        <IconButton
          label="Reset timer"
          variant="secondary"
          size="lg"
          onClick={reset}
          disabled={timer.status === 'idle'}
        >
          <RotateCcw size={19} />
        </IconButton>
        <motion.button
          type="button"
          className="stage__play"
          onClick={running ? pause : start}
          aria-label={
            running ? 'Pause' : timer.status === 'paused' ? 'Resume' : 'Start'
          }
          whileTap={{ scale: 0.92 }}
          whileHover={{ scale: 1.04 }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={running ? 'pause' : 'play'}
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {running ? (
                <Pause size={30} fill="currentColor" />
              ) : (
                <Play size={30} fill="currentColor" style={{ marginLeft: 3 }} />
              )}
            </motion.span>
          </AnimatePresence>
        </motion.button>
        <IconButton
          label="Skip to the next phase"
          variant="secondary"
          size="lg"
          onClick={skip}
        >
          <SkipForward size={19} />
        </IconButton>
      </div>

      <div
        className="cycle stage__cycle"
        aria-label={`${timer.completedFocus} of ${config.longEvery} focus sessions done before a long break`}
      >
        {Array.from({ length: config.longEvery }, (_, i) => (
          <motion.span
            key={i}
            className={`cycle__dot ${i < timer.completedFocus ? 'is-done' : ''}`}
            animate={
              i < timer.completedFocus ? { scale: [1, 1.5, 1] } : { scale: 1 }
            }
          />
        ))}
      </div>

      {timer.phase === 'focus' && (
        <label className="stage__task">
          <span>Working on</span>
          <select
            className="select"
            value={timer.taskId ?? ''}
            onChange={(e) => {
              const todo = todos.find((t) => t.id === e.target.value)
              setTask(todo ? { id: todo.id, title: todo.title } : null)
            }}
          >
            <option value="">No particular task</option>
            {timer.taskId && !openTodos.some((t) => t.id === timer.taskId) && (
              <option value={timer.taskId}>{timer.taskTitle}</option>
            )}
            {openTodos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className="stage__config">
        <span>
          {config.focusMin}m focus · {config.shortMin}m short · {config.longMin}
          m long · long break every {config.longEvery}
          {config.autoStart ? ' · auto-start' : ''}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('settings', 'pomodoro')}
        >
          <SlidersHorizontal size={14} /> Adjust
        </Button>
      </div>
    </motion.section>
  )
}
