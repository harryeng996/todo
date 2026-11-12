import {
  ExternalLink,
  Maximize2,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  X,
} from 'lucide-react'
import { useEffect } from 'react'
import {
  useYouTubePlayer,
  type PlayerInfo,
} from '../../../hooks/useYouTubePlayer.ts'
import { embedUrl, watchUrl } from '../../../lib/youtube.ts'
import type { SavedVideo } from '../../../state/useVideos.ts'
import { IconButton } from '../components/Button.tsx'

/** Past this many seconds in, ⏮ restarts the video instead of going back. */
const RESTART_THRESHOLD_S = 3

/** True while a playlist has videos after the one playing. */
function playlistGoesOn({ playlist, playlistIndex }: PlayerInfo): boolean {
  return (
    !!playlist?.length &&
    playlistIndex !== undefined &&
    playlistIndex < playlist.length - 1
  )
}

interface VideoPlayerProps {
  video: SavedVideo
  autoplay: boolean
  hasOthers: boolean
  onStep: (by: number) => void
  onPlayingChange: (playing: boolean) => void
  /** Compact controls for the floating mini player. */
  mini: boolean
  onExpand: () => void
  onClose: () => void
}

/** One video's embed and controls; keyed by video, so each starts fresh (as in v1). */
export function VideoPlayer({
  video,
  autoplay,
  hasOthers,
  onStep,
  onPlayingChange,
  mini,
  onExpand,
  onClose,
}: VideoPlayerProps) {
  const { attach, ready, playing, ...player } = useYouTubePlayer((info) => {
    if (hasOthers && !playlistGoesOn(info)) onStep(1)
  })
  const isPlaylist = !!video.playlistId

  useEffect(() => {
    onPlayingChange(playing)
  }, [playing, onPlayingChange])

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

  const toggle = playing ? player.pause : player.play

  return (
    <div className="player">
      <div className="player__frame">
        {/* src is rebuilt from parsed ids only, never from pasted markup. */}
        <iframe
          ref={attach}
          src={embedUrl(video, { autoplay, apiOrigin: location.origin })}
          title={video.name}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
      <div className="player__bar">
        {!mini && (
          <IconButton
            label="Previous video"
            size="sm"
            onClick={previous}
            disabled={!hasOthers && !ready}
          >
            <SkipBack size={16} />
          </IconButton>
        )}
        <IconButton
          label={playing ? 'Pause video' : 'Play video'}
          size="sm"
          variant="primary"
          onClick={toggle}
          disabled={!ready}
        >
          {playing ? (
            <Pause size={15} fill="currentColor" />
          ) : (
            <Play size={15} fill="currentColor" />
          )}
        </IconButton>
        <IconButton
          label="Next video"
          size="sm"
          onClick={next}
          disabled={!hasOthers && !(isPlaylist && ready)}
        >
          <SkipForward size={16} />
        </IconButton>
        <span className="player__title" title={video.name}>
          {playing && (
            <span className="player__eq" aria-hidden="true">
              <i />
              <i />
              <i />
            </span>
          )}
          {video.name}
        </span>
        {mini ? (
          <>
            <IconButton label="Open in Focus" size="sm" onClick={onExpand}>
              <Maximize2 size={15} />
            </IconButton>
            <IconButton
              label="Stop and close"
              size="sm"
              onClick={() => {
                player.pause()
                onClose()
              }}
            >
              <X size={16} />
            </IconButton>
          </>
        ) : (
          <a
            className="player__open"
            href={watchUrl(video)}
            target="_blank"
            rel="noreferrer noopener"
            title="Open on YouTube"
          >
            <ExternalLink size={14} aria-hidden="true" />
            <span>YouTube</span>
          </a>
        )}
      </div>
    </div>
  )
}
