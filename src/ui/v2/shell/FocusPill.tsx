import { Pause, Play } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
  formatCountdown,
  phaseLabel,
  phaseMs,
  remainingMs,
} from '../../../state/pomodoro.ts'
import { usePomodoro } from '../../../state/usePomodoro.ts'
import { phaseColor } from '../lib/phase.ts'
import { navigate } from '../lib/router.ts'
import { useNow } from '../lib/useNow.ts'
import { useAppSettings } from '../state/appContext.ts'

/** A floating "live activity" for a running Pomodoro while you're on another screen. */
export function FocusPill({ hidden }: { hidden: boolean }) {
  const { settings } = useAppSettings()
  const { timer, config, start, pause } = usePomodoro()
  const running = timer.status === 'running'
  const now = useNow(1000, running && !hidden)
  const show = settings.pomodoro && !hidden && timer.status !== 'idle'
  const left = remainingMs(timer, now.getTime())
  const progress = 1 - left / phaseMs(timer.phase, config)
  const color = phaseColor(timer.phase)

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="focus-pill"
          initial={{ opacity: 0, y: 24, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 24, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 420, damping: 32 }}
          style={{ ['--pill' as string]: color }}
        >
          <button
            type="button"
            className="focus-pill__main"
            onClick={() => navigate('focus')}
          >
            <span
              className={`focus-pill__dot ${running ? 'is-live' : ''}`}
              aria-hidden="true"
            />
            <span className="focus-pill__phase">{phaseLabel(timer.phase)}</span>
            <span className="focus-pill__time num">
              {formatCountdown(left)}
            </span>
            {timer.taskTitle && (
              <span className="focus-pill__task">{timer.taskTitle}</span>
            )}
          </button>
          <button
            type="button"
            className="focus-pill__toggle"
            onClick={running ? pause : start}
            aria-label={running ? 'Pause timer' : 'Resume timer'}
          >
            {running ? (
              <Pause size={15} fill="currentColor" />
            ) : (
              <Play size={15} fill="currentColor" />
            )}
          </button>
          <span
            className="focus-pill__bar"
            style={{ transform: `scaleX(${progress})` }}
            aria-hidden="true"
          />
        </motion.div>
      )}
    </AnimatePresence>
  )
}
