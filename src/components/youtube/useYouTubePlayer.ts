import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { EMBED_ORIGIN } from '../../lib/youtube.ts'

/** The embedded player's states, as YouTube numbers them. */
export const PlayerState = {
  unstarted: -1,
  ended: 0,
  playing: 1,
  paused: 2,
  buffering: 3,
  cued: 5,
} as const

/** What the player last reported about what it's playing. */
export interface PlayerInfo {
  currentTime?: number
  /** Video ids of the playlist being played (none for a single video). */
  playlist?: string[] | null
  playlistIndex?: number
}

/** How often to say hello until the player answers, and for how long. */
const HELLO_EVERY_MS = 250
const HELLO_TRIES = 40

/**
 * Controls a YouTube embed loaded with `enablejsapi=1` and this page's
 * `origin`, through the postMessage protocol YouTube's IFrame API script
 * uses, so no YouTube script runs in this page. Mount once per video (key the
 * component by it): state starts fresh with each embed.
 *
 * Until the player answers, `ready` is false and commands do nothing.
 * `onEnded` hears when a video finishes, with what was playing.
 */
export function useYouTubePlayer(onEnded: (info: PlayerInfo) => void) {
  const [frame, setFrame] = useState<HTMLIFrameElement | null>(null)
  const [ready, setReady] = useState(false)
  const [state, setState] = useState<number>(PlayerState.unstarted)
  const info = useRef<PlayerInfo>({})
  const ended = useRef(onEnded)
  useLayoutEffect(() => {
    ended.current = onEnded
  })

  useEffect(() => {
    if (!frame) return
    const post = (message: object) =>
      frame.contentWindow?.postMessage(
        JSON.stringify({ ...message, id: 1, channel: 'widget' }),
        EMBED_ORIGIN,
      )
    let last: number = PlayerState.unstarted
    const changeState = (next: number) => {
      if (next === last) return
      last = next
      setState(next)
      if (next === PlayerState.ended) ended.current({ ...info.current })
    }

    let answered = false
    function handleMessage(event: MessageEvent) {
      if (event.source !== frame?.contentWindow) return
      if (event.origin !== EMBED_ORIGIN) return
      let data: unknown
      try {
        data =
          typeof event.data === 'string' ? JSON.parse(event.data) : event.data
      } catch {
        return
      }
      if (!data || typeof data !== 'object') return
      const { event: name, info: payload } = data as {
        event?: unknown
        info?: unknown
      }
      if (!answered) {
        answered = true
        // State changes are only sent once asked for.
        post({
          event: 'command',
          func: 'addEventListener',
          args: ['onStateChange'],
        })
      }
      if (name === 'onReady') setReady(true)
      else if (name === 'onStateChange' && typeof payload === 'number')
        changeState(payload)
      else if (
        (name === 'infoDelivery' || name === 'initialDelivery') &&
        payload &&
        typeof payload === 'object'
      ) {
        const reported = payload as Record<string, unknown>
        if (typeof reported.currentTime === 'number')
          info.current.currentTime = reported.currentTime
        if (Array.isArray(reported.playlist) || reported.playlist === null)
          info.current.playlist = reported.playlist as string[] | null
        if (typeof reported.playlistIndex === 'number')
          info.current.playlistIndex = reported.playlistIndex
        if (typeof reported.playerState === 'number')
          changeState(reported.playerState)
        if (name === 'initialDelivery') setReady(true)
      }
    }
    window.addEventListener('message', handleMessage)

    // The player only talks once told someone is listening.
    let tries = 0
    const hello = () => {
      if (answered || tries++ >= HELLO_TRIES) return clearInterval(timer)
      post({ event: 'listening' })
    }
    const timer = setInterval(hello, HELLO_EVERY_MS)
    frame.addEventListener('load', hello)
    return () => {
      clearInterval(timer)
      frame.removeEventListener('load', hello)
      window.removeEventListener('message', handleMessage)
    }
  }, [frame])

  function command(func: string, ...args: unknown[]) {
    frame?.contentWindow?.postMessage(
      JSON.stringify({
        event: 'command',
        func,
        args,
        id: 1,
        channel: 'widget',
      }),
      EMBED_ORIGIN,
    )
  }

  return {
    /** Ref for the embed's <iframe>. */
    attach: setFrame,
    ready,
    /** Playing, or about to (buffering). */
    playing: state === PlayerState.playing || state === PlayerState.buffering,
    /** The latest report, read when needed (it changes several times a second). */
    info: () => ({ ...info.current }),
    play: () => command('playVideo'),
    pause: () => command('pauseVideo'),
    restart: () => command('seekTo', 0, true),
    previousInPlaylist: () => command('previousVideo'),
    nextInPlaylist: () => command('nextVideo'),
  }
}
