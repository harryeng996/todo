import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AudioHTMLAttributes,
} from 'react'
import { createJsonStore } from '../../lib/storage.ts'
import type { Track } from '../../types/track.ts'

interface PlayerSettings {
  volume: number
  muted: boolean
  lastPath: string | null
}

const settingsStore = createJsonStore<PlayerSettings>(
  'todoapp.player.v1',
  () => ({
    volume: 0.8,
    muted: false,
    lastPath: null,
  }),
)

const RESTART_THRESHOLD_S = 3

/** Drives one <audio> element over a looping playlist; broken tracks are skipped. */
export function useAudioPlayer(tracks: Track[]) {
  const [initial] = useState(() => settingsStore.load())
  const audioRef = useRef<HTMLAudioElement>(null)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(initial.volume)
  const [muted, setMuted] = useState(initial.muted)

  // The ref is read by the skip logic right away; the state copy is for rendering.
  const failed = useRef(new Set<string>())
  const [failedPaths, setFailedPaths] = useState<ReadonlySet<string>>(new Set())
  const lastPath = useRef(initial.lastPath)
  const loadedPath = useRef<string | null>(null)
  const objectUrl = useRef<string | null>(null)
  const loadToken = useRef(0)

  // New folder or rescan: forget failures and reselect the last played track.
  useEffect(() => {
    failed.current = new Set()
    setFailedPaths(failed.current)
    const i = tracks.findIndex((track) => track.path === lastPath.current)
    setIndex(Math.max(i, 0))
  }, [tracks])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = volume
    audio.muted = muted
  }, [volume, muted])

  useEffect(() => {
    lastPath.current = tracks[index]?.path ?? lastPath.current
    settingsStore.save({ volume, muted, lastPath: lastPath.current })
  }, [volume, muted, tracks, index])

  useEffect(
    () => () => {
      if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    },
    [],
  )

  /** Next index in `direction` that hasn't failed, or -1 if none is left. */
  function step(from: number, direction: 1 | -1): number {
    const n = tracks.length
    for (let offset = 1; offset <= n; offset++) {
      const i = (((from + direction * offset) % n) + n) % n
      if (!failed.current.has(tracks[i].path)) return i
    }
    return -1
  }

  async function load(i: number, autoplay: boolean) {
    const audio = audioRef.current
    const track = tracks[i]
    if (!audio || !track) return
    const token = ++loadToken.current
    setIndex(i)
    setTime(0)
    setDuration(0)

    let file: File
    try {
      file = await track.open()
    } catch {
      if (token === loadToken.current) fail(i)
      return
    }
    if (token !== loadToken.current) return // another track was chosen meanwhile

    if (objectUrl.current) URL.revokeObjectURL(objectUrl.current)
    objectUrl.current = URL.createObjectURL(file)
    loadedPath.current = track.path
    audio.src = objectUrl.current
    // Decode failures arrive as the element's `error` event, so ignore the promise here.
    if (autoplay) audio.play().catch(() => {})
  }

  function fail(i: number) {
    failed.current.add(tracks[i].path)
    setFailedPaths(new Set(failed.current))
    const next = step(i, 1)
    if (next === -1) setPlaying(false)
    else void load(next, true)
  }

  function toggle() {
    const audio = audioRef.current
    if (!audio || tracks.length === 0) return
    if (loadedPath.current !== tracks[index]?.path) void load(index, true)
    else if (audio.paused) audio.play().catch(() => {})
    else audio.pause()
  }

  function next() {
    const i = step(index, 1)
    if (i !== -1) void load(i, playing)
  }

  function prev() {
    const audio = audioRef.current
    if (
      audio &&
      loadedPath.current &&
      audio.currentTime > RESTART_THRESHOLD_S
    ) {
      audio.currentTime = 0
      return
    }
    const i = step(index, -1)
    if (i !== -1) void load(i, playing)
  }

  function select(i: number) {
    failed.current.delete(tracks[i].path) // let the user retry a skipped file
    setFailedPaths(new Set(failed.current))
    void load(i, true)
  }

  function seek(fraction: number) {
    const audio = audioRef.current
    if (audio && duration) audio.currentTime = fraction * duration
  }

  // OS media keys / lock screen.
  const actions = useRef({ toggle, next, prev, playing })
  useLayoutEffect(() => {
    actions.current = { toggle, next, prev, playing }
  })

  useEffect(() => {
    if (!('mediaSession' in navigator)) return
    const session = navigator.mediaSession
    const handlers: [MediaSessionAction, () => void][] = [
      ['play', () => !actions.current.playing && actions.current.toggle()],
      ['pause', () => actions.current.playing && actions.current.toggle()],
      ['nexttrack', () => actions.current.next()],
      ['previoustrack', () => actions.current.prev()],
    ]
    for (const [action, handler] of handlers)
      session.setActionHandler(action, handler)
    return () => {
      for (const [action] of handlers) session.setActionHandler(action, null)
    }
  }, [])

  const track = tracks[index]
  useEffect(() => {
    if (!('mediaSession' in navigator) || !track) return
    navigator.mediaSession.metadata = new MediaMetadata({
      title: track.name,
      album: track.folder,
    })
  }, [track])

  useEffect(() => {
    if ('mediaSession' in navigator) {
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    }
  }, [playing])

  const audioProps: AudioHTMLAttributes<HTMLAudioElement> = {
    preload: 'metadata',
    onPlay: () => setPlaying(true),
    onPause: () => setPlaying(false),
    onTimeUpdate: (event) => setTime(event.currentTarget.currentTime),
    onDurationChange: (event) => {
      const value = event.currentTarget.duration
      setDuration(Number.isFinite(value) ? value : 0)
    },
    onEnded: () => {
      const i = step(index, 1)
      if (i !== -1) void load(i, true)
    },
    onError: () => {
      if (loadedPath.current === tracks[index]?.path) fail(index)
    },
  }

  return {
    audioRef,
    audioProps,
    track,
    index,
    playing,
    time,
    duration,
    volume,
    setVolume,
    muted,
    toggleMute: () => setMuted((m) => !m),
    isFailed: (path: string) => failedPaths.has(path),
    toggle,
    next,
    prev,
    select,
    seek,
  }
}
