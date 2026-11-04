import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { EMBED_ORIGIN } from '../../lib/youtube.ts'
import { VideoProvider } from '../../state/VideoContext.tsx'
import { YouTubePanel } from './YouTubePanel.tsx'

const LIST = 'PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG'

function setup(
  videos = [
    { id: 'a', name: 'First', videoId: 'aaaaaaaaaaa' },
    { id: 'b', name: 'Second', videoId: 'bbbbbbbbbbb' },
    { id: 'c', name: 'Third', videoId: 'ccccccccccc' },
  ],
) {
  localStorage.setItem(
    'todoapp.videos.v1',
    JSON.stringify({ videos, currentId: videos[0].id }),
  )
  const user = userEvent.setup()
  render(
    <VideoProvider>
      <YouTubePanel onManage={() => {}} />
    </VideoProvider>,
  )
  const frame = () => document.querySelector('iframe')!
  const src = () => new URL(frame().src)
  /** Messages the page sent to the current player. */
  const spy = () => {
    const post = vi.fn()
    frame().contentWindow!.postMessage = post
    return () => post.mock.calls.map(([data]) => JSON.parse(data as string))
  }
  /** A message from the current player (or `origin`, to fake another site). */
  const tell = (data: object, origin = EMBED_ORIGIN) =>
    act(() =>
      window.dispatchEvent(
        new MessageEvent('message', {
          data: JSON.stringify(data),
          origin,
          source: frame().contentWindow,
        }),
      ),
    )
  const state = (playerState: number, info: object = {}) =>
    tell({ event: 'infoDelivery', info: { playerState, ...info } })
  return { user, frame, src, spy, tell, state }
}

const button = (name: string) => screen.getByRole('button', { name })

describe('video player', () => {
  it('loads with its API on, but plays nothing by itself on page load', () => {
    const { src } = setup()
    expect(src().searchParams.get('enablejsapi')).toBe('1')
    expect(src().searchParams.get('origin')).toBe(location.origin)
    expect(src().searchParams.has('autoplay')).toBe(false)
    // Play / pause wait for the player to answer.
    expect(button('Play')).toBeDisabled()
  })

  it('says hello until the player answers, then plays and pauses it', async () => {
    const { user, spy, tell, state } = setup()
    const sent = spy()
    await vi.waitFor(() =>
      expect(sent()).toContainEqual(
        expect.objectContaining({ event: 'listening' }),
      ),
    )
    tell({ event: 'onReady' })
    expect(sent()).toContainEqual(
      expect.objectContaining({
        func: 'addEventListener',
        args: ['onStateChange'],
      }),
    )

    await user.click(button('Play'))
    expect(sent().at(-1)).toMatchObject({ event: 'command', func: 'playVideo' })
    state(1) // playing
    await user.click(button('Pause'))
    expect(sent().at(-1)).toMatchObject({ func: 'pauseVideo' })
    state(2) // paused
    expect(button('Play')).toBeEnabled()
  })

  it('ignores messages from anywhere but the embed', () => {
    const { tell } = setup()
    tell({ event: 'onReady' }, 'https://evil.example')
    expect(button('Play')).toBeDisabled()
  })

  it('plays the next saved video when one ends, round the list', () => {
    const { frame, src, tell, state } = setup()
    tell({ event: 'onReady' })
    state(1)
    state(0) // ended
    expect(frame().title).toBe('Second')
    expect(src().searchParams.get('autoplay')).toBe('1')

    tell({ event: 'onReady' })
    state(0)
    tell({ event: 'onReady' })
    state(0)
    expect(frame().title).toBe('First') // back round
  })

  it('steps with ⏮ / ⏭, and ⏮ restarts a video a few seconds in', async () => {
    const { user, frame, src, spy, tell } = setup()
    await user.click(button('Previous video'))
    expect(frame().title).toBe('Third')
    expect(src().searchParams.get('autoplay')).toBe('1')
    await user.click(button('Next video'))
    expect(frame().title).toBe('First')

    const sent = spy()
    tell({ event: 'onReady' })
    tell({ event: 'infoDelivery', info: { currentTime: 42 } })
    await user.click(button('Previous video'))
    expect(sent().at(-1)).toMatchObject({ func: 'seekTo', args: [0, true] })
    expect(frame().title).toBe('First')
  })

  it('lets a playlist play through before moving on', async () => {
    const { user, frame, spy, tell, state } = setup([
      { id: 'p', name: 'Mix', playlistId: LIST },
      { id: 'b', name: 'Second', videoId: 'bbbbbbbbbbb' },
    ] as never)
    const sent = spy()
    tell({ event: 'onReady' })
    state(1, { playlist: ['x1', 'x2', 'x3'], playlistIndex: 0 })
    state(0) // the first of three ended: YouTube plays the next itself
    expect(frame().title).toBe('Mix')

    await user.click(button('Next video'))
    expect(sent().at(-1)).toMatchObject({ func: 'nextVideo' })

    state(1, { playlistIndex: 2 })
    state(0) // the last one ended
    expect(frame().title).toBe('Second')
  })

  it('disables ⏮ ⏭ with one plain video saved', () => {
    setup([{ id: 'a', name: 'Only', videoId: 'aaaaaaaaaaa' }])
    expect(button('Previous video')).toBeDisabled()
    expect(button('Next video')).toBeDisabled()
  })
})
