export interface YouTubeRef {
  videoId?: string
  playlistId?: string
  start?: number // seconds
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const LIST_ID = /^[A-Za-z0-9_-]{10,64}$/
const HOSTS = new Set([
  'youtube.com',
  'www.youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtu.be',
  'youtube-nocookie.com',
  'www.youtube-nocookie.com',
])

/** '90', '90s', '1m30s', '1h2m3s' → seconds. */
export function parseStart(value: string | null): number | undefined {
  if (!value) return undefined
  if (/^\d+$/.test(value)) return Number(value) || undefined
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value)
  if (!match) return undefined
  const [, h = '0', m = '0', s = '0'] = match
  return Number(h) * 3600 + Number(m) * 60 + Number(s) || undefined
}

function toUrl(text: string): URL | null {
  const withScheme = text.startsWith('//')
    ? `https:${text}`
    : /^https?:\/\//i.test(text)
      ? text
      : `https://${text}`
  try {
    return new URL(withScheme)
  } catch {
    return null
  }
}

/**
 * Reads a video/playlist id out of anything people paste: watch, youtu.be,
 * embed, shorts and live links, playlist links, an <iframe> snippet or a bare id.
 * Only ids are kept; pasted markup is never used, so it can't inject anything.
 */
export function parseYouTube(input: string): YouTubeRef | null {
  let text = input.trim()
  if (!text) return null
  if (text.startsWith('<')) {
    const src = /\ssrc\s*=\s*["']([^"']+)["']/i.exec(text)?.[1]
    if (!src) return null
    text = src.replaceAll('&amp;', '&')
  }
  if (VIDEO_ID.test(text)) return { videoId: text }

  const url = toUrl(text)
  if (!url || !HOSTS.has(url.hostname)) return null

  const parts = url.pathname.split('/').filter(Boolean)
  let videoId: string | undefined
  if (url.hostname === 'youtu.be') videoId = parts[0]
  else if (parts[0] === 'watch')
    videoId = url.searchParams.get('v') ?? undefined
  else if (
    ['embed', 'shorts', 'live', 'v'].includes(parts[0]) &&
    parts[1] !== 'videoseries'
  )
    videoId = parts[1]

  const ref: YouTubeRef = {}
  if (videoId) {
    if (!VIDEO_ID.test(videoId)) return null
    ref.videoId = videoId
  }
  const list = url.searchParams.get('list')
  if (list && LIST_ID.test(list)) ref.playlistId = list
  if (!ref.videoId && !ref.playlistId) return null

  const start = parseStart(
    url.searchParams.get('t') ?? url.searchParams.get('start'),
  )
  if (start && ref.videoId) ref.start = start
  return ref
}

/** Where embeds load from (YouTube's privacy-enhanced mode). */
export const EMBED_ORIGIN = 'https://www.youtube-nocookie.com'

export interface EmbedOptions {
  /** Start playing once loaded (browsers may still require a click first). */
  autoplay?: boolean
  /**
   * This page's origin: turns on the player's postMessage API (play, pause,
   * state changes), which then talks only to this origin.
   */
  apiOrigin?: string
}

/** Privacy-enhanced embed URL built only from parsed ids. */
export function embedUrl(
  ref: YouTubeRef,
  { autoplay = false, apiOrigin }: EmbedOptions = {},
): string {
  const params = new URLSearchParams({ rel: '0' })
  if (ref.start) params.set('start', String(ref.start))
  if (ref.playlistId) params.set('list', ref.playlistId)
  if (autoplay) params.set('autoplay', '1')
  if (apiOrigin) {
    params.set('enablejsapi', '1')
    params.set('origin', apiOrigin)
  }
  return `${EMBED_ORIGIN}/embed/${ref.videoId ?? 'videoseries'}?${params}`
}

export function watchUrl(ref: YouTubeRef): string {
  if (!ref.videoId)
    return `https://www.youtube.com/playlist?list=${ref.playlistId}`
  const params = new URLSearchParams({ v: ref.videoId })
  if (ref.playlistId) params.set('list', ref.playlistId)
  if (ref.start) params.set('t', `${ref.start}s`)
  return `https://www.youtube.com/watch?${params}`
}

export function sameVideo(a: YouTubeRef, b: YouTubeRef): boolean {
  return a.videoId === b.videoId && a.playlistId === b.playlistId
}
