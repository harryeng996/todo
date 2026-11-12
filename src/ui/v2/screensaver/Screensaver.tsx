import '@fontsource/dm-serif-display/latin-400.css'
import '@fontsource/libre-caslon-text/latin-400.css'
import '@fontsource/libre-caslon-text/latin-400-italic.css'
import '@fontsource-variable/oswald'
import '@fontsource/patrick-hand/latin-400.css'
import './screensaver.css'
import { ChevronLeft, ChevronRight, Expand, Shrink, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  formatCountdown,
  phaseLabel,
  phaseMs,
  remainingMs,
} from '../../../state/pomodoro.ts'
import { POSTER_IDS, type PosterId } from '../../../state/useSettings.ts'
import { usePomodoro } from '../../../state/usePomodoro.ts'
import { useNow } from '../lib/useNow.ts'
import { useAppSettings } from '../state/appContext.ts'
import { usePosterData } from './usePosterData.ts'
import { POSTERS } from './posterRegistry.ts'

interface ScreensaverProps {
  onExit: () => void
}

/**
 * A framed picture on a sunlit wall, built from your own numbers. Changes
 * picture on a timer; any click or key returns to the app (moving the mouse
 * only shows the controls).
 */
export default function Screensaver({ onExit }: ScreensaverProps) {
  const { settings, resolvedTheme, reducedMotion } = useAppSettings()
  const data = usePosterData()
  const chosen = settings.screensaverPosters
  const posters = useMemo<PosterId[]>(() => {
    const enabled = POSTER_IDS.filter((p) => chosen.includes(p))
    return enabled.length ? enabled : ['statement']
  }, [chosen])
  const [index, setIndex] = useState(0)
  const [rounds, setRounds] = useState<Record<string, number>>({})
  const [controls, setControls] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const hideControls = useRef<ReturnType<typeof setTimeout>>(undefined)

  const id = posters[index % posters.length]
  const { Component } = POSTERS[id]

  const step = useCallback(
    (by: number) => {
      setIndex((i) => {
        const next = (i + by + posters.length) % posters.length
        const nextId = posters[next]
        setRounds((r) => ({ ...r, [nextId]: (r[nextId] ?? 0) + 1 }))
        return next
      })
    },
    [posters],
  )

  // Next picture on a timer (with one style, the same frame gets fresh content).
  useEffect(() => {
    const timer = setTimeout(
      () => step(1),
      settings.screensaverIntervalSec * 1000,
    )
    return () => clearTimeout(timer)
  }, [index, rounds, step, settings.screensaverIntervalSec])

  // Clicks and keys leave; the mouse moving shows the controls for a moment.
  useEffect(() => {
    root.current?.focus()
    const leave = (event: Event) => {
      const target = event.target as HTMLElement | null
      if (target?.closest('.saver__controls')) return
      event.preventDefault()
      event.stopPropagation()
      onExit()
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'ArrowRight') return step(1)
      if (event.key === 'ArrowLeft') return step(-1)
      if (
        event.key === 'Tab' &&
        (event.target as HTMLElement)?.closest('.saver__controls')
      )
        return
      leave(event)
    }
    const onMove = () => {
      setControls(true)
      clearTimeout(hideControls.current)
      hideControls.current = setTimeout(() => setControls(false), 2500)
    }
    window.addEventListener('pointerdown', leave, true)
    window.addEventListener('keydown', onKey, true)
    window.addEventListener('pointermove', onMove)
    return () => {
      window.removeEventListener('pointerdown', leave, true)
      window.removeEventListener('keydown', onKey, true)
      window.removeEventListener('pointermove', onMove)
      clearTimeout(hideControls.current)
    }
  }, [onExit, step])

  // The page underneath must not scroll (or show a scrollbar).
  useEffect(() => {
    const root = document.documentElement
    const before = root.style.overflow
    root.style.overflow = 'hidden'
    return () => {
      root.style.overflow = before
    }
  }, [])

  // Keep the screen on, if asked and supported.
  useEffect(() => {
    if (!settings.screensaverWakeLock || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false
    const request = () => {
      if (document.visibilityState !== 'visible') return
      void navigator.wakeLock
        .request('screen')
        .then((l) => {
          if (released) void l.release()
          else lock = l
        })
        .catch(() => undefined)
    }
    request()
    document.addEventListener('visibilitychange', request)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', request)
      void lock?.release()
    }
  }, [settings.screensaverWakeLock])

  // Leave full screen with the screensaver.
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  return (
    <motion.div
      ref={root}
      className={`saver saver--${resolvedTheme} ${reducedMotion ? 'saver--still' : ''} ${controls ? 'show-controls' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Screensaver. Press any key to return."
      tabIndex={-1}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.8 }}
    >
      <div className="saver__wall" aria-hidden="true">
        <div className="saver__window">
          <span />
          <span />
          <span />
          <span />
        </div>
        <div className="saver__glow" />
      </div>
      <div className="saver__floor" aria-hidden="true">
        <div className="saver__baseboard" />
      </div>

      {settings.screensaverClock && <WallClock />}
      <FocusNote />

      <div className="saver__stage">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${id}-${rounds[id] ?? 0}`}
            className="frame"
            initial={{ opacity: 0, y: 18, rotate: -0.4 }}
            animate={{ opacity: 1, y: 0, rotate: 0 }}
            exit={{ opacity: 0, y: -10, rotate: 0.3 }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="frame__paper">
              <Component data={data} round={rounds[id] ?? 0} />
            </div>
            <div className="frame__glass" aria-hidden="true" />
          </motion.div>
        </AnimatePresence>
      </div>

      <div className="saver__controls">
        <button
          type="button"
          onClick={() => step(-1)}
          aria-label="Previous picture"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="saver__name">{POSTERS[id].label}</span>
        <button type="button" onClick={() => step(1)} aria-label="Next picture">
          <ChevronRight size={18} />
        </button>
        <button
          type="button"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {fullscreen ? <Shrink size={16} /> : <Expand size={16} />}
        </button>
        <button type="button" onClick={onExit} aria-label="Close screensaver">
          <X size={18} />
        </button>
      </div>
      <p className="saver__hint">Click or press any key to return</p>
    </motion.div>
  )
}

/** A quiet analog clock on the wall. */
function WallClock() {
  const now = useNow(1000)
  const s = now.getSeconds()
  const m = now.getMinutes() + s / 60
  const h = (now.getHours() % 12) + m / 60
  return (
    <div
      className="wallclock"
      aria-label={now.toLocaleTimeString('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
      })}
      role="img"
    >
      <svg viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="47" className="wallclock__rim" />
        <circle cx="50" cy="50" r="43" className="wallclock__face" />
        {Array.from({ length: 12 }, (_, i) => (
          <line
            key={i}
            x1="50"
            y1={i % 3 === 0 ? 10 : 11.5}
            x2="50"
            y2={i % 3 === 0 ? 17 : 15}
            className={
              i % 3 === 0
                ? 'wallclock__tick wallclock__tick--major'
                : 'wallclock__tick'
            }
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}
        <line
          x1="50"
          y1="52"
          x2="50"
          y2="28"
          className="wallclock__hour"
          transform={`rotate(${h * 30} 50 50)`}
        />
        <line
          x1="50"
          y1="54"
          x2="50"
          y2="17"
          className="wallclock__minute"
          transform={`rotate(${m * 6} 50 50)`}
        />
        <line
          x1="50"
          y1="58"
          x2="50"
          y2="14"
          className="wallclock__second"
          transform={`rotate(${s * 6} 50 50)`}
        />
        <circle cx="50" cy="50" r="2.4" className="wallclock__pin" />
      </svg>
      <span className="wallclock__date">
        {now.toLocaleDateString('en-GB', {
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        })}
      </span>
    </div>
  )
}

/** A sticky note with the running Pomodoro, taped next to the frame. */
function FocusNote() {
  const { timer, config } = usePomodoro()
  const { settings } = useAppSettings()
  const running = timer.status === 'running'
  const now = useNow(1000, running)
  if (!settings.pomodoro || timer.status === 'idle') return null
  const left = Math.min(
    remainingMs(timer, now.getTime()),
    phaseMs(timer.phase, config),
  )
  return (
    <div
      className={`saver__note saver__note--${timer.phase === 'focus' ? 'focus' : 'break'}`}
    >
      <span className="saver__tape" aria-hidden="true" />
      <small>{running ? phaseLabel(timer.phase) : 'Paused'}</small>
      <strong className="num">{formatCountdown(left)}</strong>
      {timer.taskTitle && <span>{timer.taskTitle}</span>}
    </div>
  )
}
