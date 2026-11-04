import { describe, expect, it } from 'vitest'
import { embedUrl, parseStart, parseYouTube, watchUrl } from './youtube.ts'

const ID = 'dQw4w9WgXcQ'
const LIST = 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG'

describe('parseYouTube', () => {
  it.each([
    [`https://www.youtube.com/watch?v=${ID}`, { videoId: ID }],
    [`youtube.com/watch?v=${ID}`, { videoId: ID }],
    [`https://m.youtube.com/watch?v=${ID}&feature=share`, { videoId: ID }],
    [`https://music.youtube.com/watch?v=${ID}`, { videoId: ID }],
    [`https://youtu.be/${ID}?si=abc`, { videoId: ID }],
    [`https://youtu.be/${ID}?t=90`, { videoId: ID, start: 90 }],
    [
      `https://www.youtube.com/watch?v=${ID}&t=1m30s`,
      { videoId: ID, start: 90 },
    ],
    [
      `https://www.youtube.com/embed/${ID}?start=42`,
      { videoId: ID, start: 42 },
    ],
    [`https://www.youtube-nocookie.com/embed/${ID}`, { videoId: ID }],
    [`https://www.youtube.com/shorts/${ID}`, { videoId: ID }],
    [`https://www.youtube.com/live/${ID}?feature=shared`, { videoId: ID }],
    [`//www.youtube.com/embed/${ID}`, { videoId: ID }],
    [ID, { videoId: ID }],
    [
      `https://www.youtube.com/watch?v=${ID}&list=${LIST}`,
      { videoId: ID, playlistId: LIST },
    ],
    [`https://www.youtube.com/playlist?list=${LIST}`, { playlistId: LIST }],
    [
      `https://www.youtube.com/embed/videoseries?list=${LIST}`,
      { playlistId: LIST },
    ],
  ])('reads %s', (input, expected) => {
    expect(parseYouTube(input)).toEqual(expected)
  })

  it('reads the src of a pasted <iframe> snippet', () => {
    const snippet = `<iframe width="560" height="315" src="https://www.youtube.com/embed/${ID}?si=x&amp;start=30" title="YouTube video player" frameborder="0" allowfullscreen></iframe>`
    expect(parseYouTube(snippet)).toEqual({ videoId: ID, start: 30 })
  })

  it.each([
    '',
    'hello world',
    'https://vimeo.com/123456',
    `https://youtube.com.evil.example/watch?v=${ID}`,
    `https://evil.example/?u=https://www.youtube.com/watch?v=${ID}`,
    'javascript:alert(1)',
    `<script>alert(1)</script>`,
    `<iframe src="https://evil.example/embed/${ID}"></iframe>`,
    'https://www.youtube.com/watch?v=short',
    `https://www.youtube.com/watch?v=${ID}"><script>`,
    'https://www.youtube.com/',
  ])('rejects %s', (input) => {
    expect(parseYouTube(input)).toBeNull()
  })
})

describe('parseStart', () => {
  it('reads seconds and h/m/s forms', () => {
    expect(parseStart('75')).toBe(75)
    expect(parseStart('75s')).toBe(75)
    expect(parseStart('1h2m3s')).toBe(3723)
    expect(parseStart('0')).toBeUndefined()
    expect(parseStart('soon')).toBeUndefined()
  })
})

describe('urls', () => {
  it('embeds through youtube-nocookie with only parsed ids', () => {
    expect(embedUrl({ videoId: ID, start: 30 })).toBe(
      `https://www.youtube-nocookie.com/embed/${ID}?rel=0&start=30`,
    )
    expect(embedUrl({ playlistId: LIST })).toBe(
      `https://www.youtube-nocookie.com/embed/videoseries?rel=0&list=${LIST}`,
    )
  })

  it('asks for autoplay and the player API only when told to', () => {
    const url = new URL(
      embedUrl(
        { videoId: ID },
        { autoplay: true, apiOrigin: 'http://localhost:5173' },
      ),
    )
    expect(url.searchParams.get('autoplay')).toBe('1')
    expect(url.searchParams.get('enablejsapi')).toBe('1')
    expect(url.searchParams.get('origin')).toBe('http://localhost:5173')
  })

  it('links back to YouTube', () => {
    expect(watchUrl({ videoId: ID, start: 30 })).toBe(
      `https://www.youtube.com/watch?v=${ID}&t=30s`,
    )
    expect(watchUrl({ playlistId: LIST })).toBe(
      `https://www.youtube.com/playlist?list=${LIST}`,
    )
  })
})
