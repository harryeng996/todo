import { AnimatePresence } from 'motion/react'
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useAppSettings } from '../state/appContext.ts'
import { ScreensaverContext } from '../state/screensaver.ts'
import { useVideoDock } from '../state/videoDock.ts'

// Its own chunk (with the poster fonts): loaded the first time it shows.
const Screensaver = lazy(() => import('../screensaver/Screensaver.tsx'))

const ACTIVITY = [
  'pointermove',
  'pointerdown',
  'keydown',
  'wheel',
  'touchstart',
  'scroll',
] as const
const CHECK_EVERY_MS = 2000

/**
 * Starts the screensaver after the chosen idle time (not while a video plays
 * or the tab is hidden), or on request.
 */
export function ScreensaverProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings()
  const { playing } = useVideoDock()
  const [active, setActive] = useState(false)
  const playingRef = useRef(playing)
  useEffect(() => {
    playingRef.current = playing
  }, [playing])

  const start = useCallback(() => setActive(true), [])
  const stop = useCallback(() => setActive(false), [])

  useEffect(() => {
    const idleMs = settings.screensaverIdleMin * 60_000
    if (!idleMs || active) return
    let last = Date.now()
    const bump = () => {
      last = Date.now()
    }
    ACTIVITY.forEach((e) =>
      window.addEventListener(e, bump, { passive: true, capture: true }),
    )
    const timer = setInterval(() => {
      // Watching a video or away in another tab counts as busy.
      if (playingRef.current || document.visibilityState !== 'visible')
        return bump()
      if (Date.now() - last >= idleMs) setActive(true)
    }, CHECK_EVERY_MS)
    return () => {
      ACTIVITY.forEach((e) =>
        window.removeEventListener(e, bump, { capture: true }),
      )
      clearInterval(timer)
    }
  }, [settings.screensaverIdleMin, active])

  return (
    <ScreensaverContext value={{ active, start, stop }}>
      {children}
      <AnimatePresence>
        {active && (
          <Suspense key="saver" fallback={null}>
            <Screensaver onExit={stop} />
          </Suspense>
        )}
      </AnimatePresence>
    </ScreensaverContext>
  )
}
