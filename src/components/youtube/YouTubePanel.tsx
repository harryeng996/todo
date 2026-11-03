import { ExternalLink, MonitorPlay, SlidersHorizontal } from 'lucide-react'
import { embedUrl, watchUrl } from '../../lib/youtube.ts'
import { useVideos } from '../../state/useVideos.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'

interface YouTubePanelProps {
  /** Opens Settings → Videos, where links are added and removed. */
  onManage: () => void
}

/** The player. Saved links are managed in Settings → Videos. */
export function YouTubePanel({ onManage }: YouTubePanelProps) {
  const { videos, current, select } = useVideos()

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
            onChange={(event) => select(event.target.value)}
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
        <div className="youtube__player">
          {/* The screen sizes the 16:9 frame to fit whatever room is left. */}
          <div className="youtube__screen">
            <div className="youtube__frame">
              {/* src is rebuilt from parsed ids only, never from pasted markup. */}
              <iframe
                key={current.id}
                src={embedUrl(current)}
                title={current.name}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                loading="lazy"
              />
            </div>
          </div>
          <a
            className="youtube__open"
            href={watchUrl(current)}
            target="_blank"
            rel="noreferrer noopener"
          >
            <ExternalLink size={14} strokeWidth={1.75} aria-hidden="true" />{' '}
            Open on YouTube
          </a>
        </div>
      ) : (
        <div className="youtube__empty">
          <p>No videos yet.</p>
          <SketchButton onClick={onManage}>Add a YouTube link</SketchButton>
        </div>
      )}
    </SketchBox>
  )
}
