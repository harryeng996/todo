import { Plus, X } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { MAX_LENGTH } from '../../lib/limits.ts'
import { useVideos } from '../../state/useVideos.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchInput } from '../sketch/SketchInput.tsx'

/** Saved YouTube links: pick the one to play, remove, or paste a new one. */
export function VideoSettings() {
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
    <div className="settings__group">
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
            maxLength={MAX_LENGTH.name}
            aria-label="Video name (optional)"
          />
          <SketchButton type="submit" variant="primary" aria-label="Add video">
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

      {videos.length === 0 ? (
        <p className="settings__hint">No saved videos yet.</p>
      ) : (
        <ul className="youtube__list sketch-scroll" aria-label="Saved videos">
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
      <p className="settings__hint">
        Only the video id is kept; videos play through youtube-nocookie.com.
      </p>
    </div>
  )
}
