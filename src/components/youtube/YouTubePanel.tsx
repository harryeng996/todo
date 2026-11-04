import {
  ExternalLink,
  MonitorPlay,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
} from 'lucide-react'
import { useState } from 'react'
import { embedUrl, watchUrl } from '../../lib/youtube.ts'
import { useVideos, type SavedVideo } from '../../state/useVideos.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { useYouTubePlayer, type PlayerInfo } from './useYouTubePlayer.ts'

/** Past this many seconds in, ⏮ restarts the video instead of going back. */
const RESTART_THRESHOLD_S = 3
const icon = { size: 20, strokeWidth: 1.75, 'aria-hidden': true } as const

interface YouTubePanelProps {
  /** Opens Settings → Videos, where links are added and removed. */
  onManage: () => void
}

/**
 * The player. Saved links are managed in Settings → Videos. When a video
 * ends the next saved one plays, round the list (a playlist plays through
 * first). Nothing plays by itself on page load: autoplay starts once a video
 * has been chosen or skipped to here.
 */
export function YouTubePanel({ onManage }: YouTubePanelProps) {
  const { videos, current, select } = useVideos()
  const [autoplay, setAutoplay] = useState(false)
  // Bumped to reload the player when "moving on" lands on the same video.
  const [replay, setReplay] = useState(0)

  function play(id: string) {
    setAutoplay(true)
    if (id === current?.id) setReplay((n) => n + 1)
    else select(id)
  }

  /** Plays the saved video `by` places along, round the list. */
  function step(by: number) {
    if (!current) return
    const index = videos.findIndex((video) => video.id === current.id)
    play(videos[(index + by + videos.length) % videos.length].id)
  }

  return (
    <SketchBox seed={53} className="youtube">
      <header className="youtube__header">
        <h2 className="youtube__heading">
          <MonitorPlay size={20} strokeWidth={1.75} aria-hidden="true" /> Videos
        </h2>
        {videos.length > 1 && current && (
          <select
            className="youtube__picker sketch-border--alt"
            value={current.id}
            onChange={(event) => play(event.target.value)}
            aria-label="Choose a video"
          >
            {videos.map((video) => (
              <option key={video.id} value={video.id}>
                {video.name}
              </option>
            ))}
          </select>
        )}
        <SketchButton
          variant="ghost"
          onClick={onManage}
          aria-label="Manage video links"
          title="Manage video links"
        >
          <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
        </SketchButton>
      </header>
      {current ? (
        <VideoPlayer
          key={`${current.id}|${replay}`}
          video={current}
          autoplay={autoplay}
          hasOthers={videos.length > 1}
          onStep={step}
        />
      ) : (
        <div className="youtube__empty">
          <p>No videos yet.</p>
          <SketchButton onClick={onManage}>Add a YouTube link</SketchButton>
        </div>
      )}
    </SketchBox>
  )
}

interface VideoPlayerProps {
  video: SavedVideo
  autoplay: boolean
  /** More than this one saved, so ⏮ / ⏭ and the end of a video move on. */
  hasOthers: boolean
  /** Moves to the saved video `by` places along. */
  onStep: (by: number) => void
}

/** True while a playlist has videos after the one playing. */
function playlistGoesOn({ playlist, playlistIndex }: PlayerInfo): boolean {
  return (
    !!playlist?.length &&
    playlistIndex !== undefined &&
    playlistIndex < playlist.length - 1
  )
}

/** One video's embed and its controls; keyed by video, so each starts fresh. */
function VideoPlayer({ video, autoplay, hasOthers, onStep }: VideoPlayerProps) {
  const { attach, ready, playing, ...player } = useYouTubePlayer((info) => {
    // A playlist goes on to its next video by itself.
    if (hasOthers && !playlistGoesOn(info)) onStep(1)
  })
  const isPlaylist = !!video.playlistId

  function previous() {
    const info = player.info()
    if (ready && (info.currentTime ?? 0) > RESTART_THRESHOLD_S) player.restart()
    else if (ready && isPlaylist && (info.playlistIndex ?? 0) > 0)
      player.previousInPlaylist()
    else if (hasOthers) onStep(-1)
  }

  function next() {
    if (ready && isPlaylist && (playlistGoesOn(player.info()) || !hasOthers))
      player.nextInPlaylist()
    else if (hasOthers) onStep(1)
  }

  return (
    <div className="youtube__player">
      {/* The screen sizes the 16:9 frame to fit whatever room is left. */}
      <div className="youtube__screen">
        <div className="youtube__frame">
          {/* src is rebuilt from parsed ids only, never from pasted markup. */}
          <iframe
            ref={attach}
            src={embedUrl(video, { autoplay, apiOrigin: location.origin })}
            title={video.name}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            loading="lazy"
          />
        </div>
      </div>
      <div className="youtube__controls">
        <SketchButton
          variant="ghost"
          onClick={previous}
          disabled={!hasOthers && !ready}
          aria-label="Previous video"
          title="Previous video"
        >
          <SkipBack {...icon} />
        </SketchButton>
        <SketchButton
          variant="primary"
          onClick={playing ? player.pause : player.play}
          disabled={!ready}
          aria-label={playing ? 'Pause' : 'Play'}
          title={playing ? 'Pause' : 'Play'}
        >
          {playing ? <Pause {...icon} /> : <Play {...icon} />}
        </SketchButton>
        <SketchButton
          variant="ghost"
          onClick={next}
          disabled={!hasOthers && !(isPlaylist && ready)}
          aria-label="Next video"
          title="Next video"
        >
          <SkipForward {...icon} />
        </SketchButton>
        <a
          className="youtube__open"
          href={watchUrl(video)}
          target="_blank"
          rel="noreferrer noopener"
        >
          <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" /> Open
          on YouTube
        </a>
      </div>
    </div>
  )
}
