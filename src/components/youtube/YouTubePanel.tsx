import { ExternalLink, Link2, MonitorPlay, Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { embedUrl, watchUrl } from '../../lib/youtube.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchInput } from '../sketch/SketchInput.tsx'
import { useVideos } from './useVideos.ts'

/**
 * Two boxes side by side: the player, and the list of links you've added
 * with the form for a new one. They share one saved-video state.
 */
export function YouTubePanel() {
  const { videos, current, add, select, remove } = useVideos()
  const [link, setLink] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const problem = add(link, name)
    setError(problem ?? '')
    if (!problem) {
      setLink('')
      setName('')
    }
  }

  return (
    <>
      <SketchBox seed={53} className="youtube">
        <h2 className="youtube__heading">
          <MonitorPlay size={20} strokeWidth={1.75} aria-hidden="true" /> Videos
        </h2>
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
          <p className="youtube__empty">
            Add a YouTube link to start watching.
          </p>
        )}
      </SketchBox>

      <SketchBox seed={57} className="youtube-links">
        <h2 className="youtube__heading">
          <Link2 size={20} strokeWidth={1.75} aria-hidden="true" /> Video links
          <span className="youtube__count">{videos.length}</span>
        </h2>

        {videos.length > 0 && (
          <ul className="youtube__list sketch-scroll">
            {videos.map((video) => (
              <li key={video.id} className="youtube__item">
                <button
                  type="button"
                  className={
                    video.id === current?.id
                      ? 'youtube__select youtube__select--current'
                      : 'youtube__select'
                  }
                  onClick={() => select(video.id)}
                  aria-current={video.id === current?.id ? 'true' : undefined}
                >
                  {video.name}
                </button>
                <SketchButton
                  variant="ghost"
                  className="youtube__remove"
                  onClick={() => remove(video.id)}
                  aria-label={`Remove "${video.name}"`}
                >
                  <X size={16} strokeWidth={1.75} aria-hidden="true" />
                </SketchButton>
              </li>
            ))}
          </ul>
        )}

        <form className="youtube__form" onSubmit={handleSubmit} noValidate>
          <SketchInput
            value={link}
            onChange={(event) => setLink(event.target.value)}
            placeholder="Paste a YouTube link or embed code"
            aria-label="YouTube link or embed code"
          />
          <div className="youtube__form-row">
            <SketchInput
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Name (optional)"
              aria-label="Video name (optional)"
            />
            <SketchButton
              type="submit"
              variant="primary"
              aria-label="Add video"
            >
              <Plus size={18} strokeWidth={2} aria-hidden="true" />
              Add
            </SketchButton>
          </div>
          {error && (
            <p className="youtube__error" role="alert">
              {error}
            </p>
          )}
        </form>
      </SketchBox>
    </>
  )
}
