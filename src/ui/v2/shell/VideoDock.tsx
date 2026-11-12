import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { useVideos } from '../../../state/useVideos.ts'
import { navigate } from '../lib/router.ts'
import { useAppSettings } from '../state/appContext.ts'
import { VideoDockContext } from '../state/videoDock.ts'
import { VideoPlayer } from './VideoPlayer.tsx'

/**
 * Keeps one YouTube player alive for the whole app. On the Focus screen it
 * sits over that screen's slot; elsewhere, while playing, it floats as a mini
 * player. The iframe is never re-parented, so playback never restarts.
 */
export function VideoDockProvider({ children }: { children: ReactNode }) {
  const { settings } = useAppSettings()
  const { videos, current, select } = useVideos()
  const [slot, setSlot] = useState<HTMLElement | null>(null)
  // Nothing plays by itself on page load (as in v1): only after a choice here.
  const [autoplay, setAutoplay] = useState(false)
  const [replay, setReplay] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const layer = useRef<HTMLDivElement>(null)

  const play = useCallback(
    (id: string) => {
      setAutoplay(true)
      setDismissed(false)
      if (id === current?.id) setReplay((n) => n + 1)
      else select(id)
    },
    [current?.id, select],
  )

  function step(by: number) {
    if (!current) return
    const index = videos.findIndex((v) => v.id === current.id)
    play(videos[(index + by + videos.length) % videos.length].id)
  }

  const docked = slot !== null
  const visible = docked || (playing && !dismissed)

  // Follow the slot every frame while docked (it moves with scrolling and screen transitions).
  useLayoutEffect(() => {
    const el = layer.current
    if (!el) return
    if (!slot) {
      el.style.removeProperty('top')
      el.style.removeProperty('left')
      el.style.removeProperty('width')
      el.style.removeProperty('height')
      return
    }
    let frame = 0
    let last = ''
    const follow = () => {
      const r = slot.getBoundingClientRect()
      const key = `${r.top}|${r.left}|${r.width}|${r.height}`
      if (key !== last) {
        last = key
        el.style.top = `${r.top}px`
        el.style.left = `${r.left}px`
        el.style.width = `${r.width}px`
        el.style.height = `${r.height}px`
      }
      frame = requestAnimationFrame(follow)
    }
    follow()
    return () => cancelAnimationFrame(frame)
  }, [slot])

  const onPlayingChange = useCallback((p: boolean) => {
    setPlaying(p)
    // Playing again (e.g. from the Focus screen) brings a closed mini player back.
    if (p) setDismissed(false)
  }, [])

  return (
    <VideoDockContext value={{ setSlot, play, playing }}>
      {children}
      {settings.youtube && current && (
        <div
          ref={layer}
          className={`video-float ${docked ? 'is-docked' : 'is-mini'} ${visible ? '' : 'is-hidden'}`}
          aria-hidden={visible ? undefined : true}
        >
          <VideoPlayer
            key={`${current.id}|${replay}`}
            video={current}
            autoplay={autoplay}
            hasOthers={videos.length > 1}
            onStep={step}
            onPlayingChange={onPlayingChange}
            mini={!docked}
            onExpand={() => navigate('focus')}
            onClose={() => setDismissed(true)}
          />
        </div>
      )}
    </VideoDockContext>
  )
}
