import '@fontsource-variable/archivo/wdth.css'
import './screensaver.css'
import {
  Expand,
  LayoutTemplate,
  Palette as PaletteIcon,
  Shrink,
  X,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { SaverLayout, SaverTheme } from '../../../state/useSettings.ts'
import { useNow } from '../lib/useNow.ts'
import { useAppSettings } from '../state/appContext.ts'
import { SaverScene } from './SaverScene.tsx'
import { PALETTE_IDS, paletteFor } from './themes.ts'
import { useSaverData } from './useSaverData.ts'

const LAYOUTS: SaverLayout[] = ['centered', 'standby', 'minimal']
const LAYOUT_LABEL: Record<SaverLayout, string> = {
  centered: 'Centered',
  standby: 'StandBy',
  minimal: 'Minimal',
}

/**
 * Full-screen ambient clock. Any click or key returns to the app; moving the
 * mouse only shows the controls (colours, layout, full screen, close).
 */
export default function Screensaver({ onExit }: { onExit: () => void }) {
  const { settings, update, reducedMotion } = useAppSettings()
  const data = useSaverData()
  const hour = useNow(60_000).getHours()
  const palette = paletteFor(settings.screensaverTheme, hour)
  const [controls, setControls] = useState(false)
  const [fullscreen, setFullscreen] = useState(false)
  const root = useRef<HTMLDivElement>(null)
  const hideControls = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Clicks and keys leave; the mouse moving shows the controls for a moment.
  useEffect(() => {
    root.current?.focus()
    const inControls = (e: Event) =>
      !!(e.target as HTMLElement | null)?.closest?.('.saver__controls')
    const exit = (e: Event) => {
      e.preventDefault()
      e.stopPropagation()
      onExit()
    }
    const leave = (e: Event) => {
      if (!inControls(e)) exit(e)
    }
    // Keys leave too, except those that work the focused control (Escape always leaves).
    const onKey = (e: KeyboardEvent) => {
      const activates = e.key === 'Tab' || e.key === 'Enter' || e.key === ' '
      if (activates && inControls(e)) return
      exit(e)
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
  }, [onExit])

  // The page underneath must not scroll (or show a scrollbar).
  useEffect(() => {
    const html = document.documentElement
    const before = html.style.overflow
    html.style.overflow = 'hidden'
    return () => {
      html.style.overflow = before
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

  // Leave full screen together with the screensaver.
  useEffect(() => {
    const sync = () => setFullscreen(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', sync)
    return () => {
      document.removeEventListener('fullscreenchange', sync)
      if (document.fullscreenElement)
        void document.exitFullscreen().catch(() => undefined)
    }
  }, [])

  function nextTheme() {
    const order: SaverTheme[] = ['auto', ...PALETTE_IDS]
    const i = order.indexOf(settings.screensaverTheme)
    update({ screensaverTheme: order[(i + 1) % order.length] })
  }

  function nextLayout() {
    const i = LAYOUTS.indexOf(settings.screensaverLayout)
    update({ screensaverLayout: LAYOUTS[(i + 1) % LAYOUTS.length] })
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) void document.exitFullscreen()
    else
      void document.documentElement.requestFullscreen?.().catch(() => undefined)
  }

  const themeName =
    settings.screensaverTheme === 'auto'
      ? `Auto · ${palette.label}`
      : palette.label

  return (
    <motion.div
      ref={root}
      className={`saver ${reducedMotion ? 'saver--still' : ''} ${controls ? 'show-controls' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Screensaver. Press any key to return."
      tabIndex={-1}
      initial={{ opacity: 0, scale: 1.03 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.02 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
    >
      <SaverScene
        data={data}
        palette={palette}
        layout={settings.screensaverLayout}
        widgets={settings.screensaverWidgets}
        seconds={settings.screensaverSeconds}
      />

      <div className="saver__controls">
        <button type="button" onClick={nextTheme} title="Change colours">
          <PaletteIcon size={16} aria-hidden="true" />
          <span>{themeName}</span>
        </button>
        <button type="button" onClick={nextLayout} title="Change layout">
          <LayoutTemplate size={16} aria-hidden="true" />
          <span>{LAYOUT_LABEL[settings.screensaverLayout]}</span>
        </button>
        <button
          type="button"
          className="saver__icon"
          onClick={toggleFullscreen}
          aria-label={fullscreen ? 'Exit full screen' : 'Full screen'}
        >
          {fullscreen ? <Shrink size={16} /> : <Expand size={16} />}
        </button>
        <button
          type="button"
          className="saver__icon"
          onClick={onExit}
          aria-label="Close screensaver"
        >
          <X size={17} />
        </button>
      </div>
      <p className="saver__hint">Press any key or click to return</p>
    </motion.div>
  )
}
