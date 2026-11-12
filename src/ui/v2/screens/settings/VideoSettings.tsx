import { ExternalLink, MonitorPlay, Play, Plus, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { MAX_LENGTH } from '../../../../lib/limits.ts'
import { watchUrl } from '../../../../lib/youtube.ts'
import { useVideos } from '../../../../state/useVideos.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { useVideoDock } from '../../state/videoDock.ts'

/** Saved YouTube links: add, play, remove. */
export function VideoSettings({ id }: { id: string }) {
  const { videos, current, add, remove } = useVideos()
  const { play } = useVideoDock()
  const [link, setLink] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const problem = add(link, name)
    setError(problem ?? '')
    if (!problem) {
      setLink('')
      setName('')
    }
  }

  return (
    <Card
      id={id}
      icon={<MonitorPlay size={16} />}
      title="Videos"
      subtitle="YouTube links for the Focus soundtrack. Only ids are kept; nothing loads until played."
    >
      <form className="quote-add" onSubmit={submit} noValidate>
        <input
          className="input"
          value={link}
          onChange={(e) => setLink(e.target.value)}
          placeholder="Paste a YouTube link or embed code"
          aria-label="YouTube link or embed code"
        />
        <div className="quote-add__row">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (optional)"
            maxLength={MAX_LENGTH.name}
            aria-label="Video name (optional)"
          />
          <Button type="submit" variant="primary" icon={<Plus size={16} />}>
            Add video
          </Button>
        </div>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
      </form>

      {videos.length === 0 ? (
        <p className="empty">No saved videos yet.</p>
      ) : (
        <ul className="setting-list">
          <AnimatePresence initial={false}>
            {videos.map((v) => (
              <motion.li
                key={v.id}
                layout
                className="setting-list__item"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="setting-row">
                  <div className="setting-row__main">
                    <strong>
                      {v.name}
                      {v.id === current?.id && (
                        <em className="chip chip--accent">current</em>
                      )}
                    </strong>
                    <span className="subtle">
                      {v.playlistId ? 'Playlist' : 'Video'}
                    </span>
                  </div>
                  <IconButton
                    label={`Play ${v.name}`}
                    size="sm"
                    onClick={() => play(v.id)}
                  >
                    <Play size={14} />
                  </IconButton>
                  <a
                    className="btn btn--ghost btn--sm btn--icon"
                    href={watchUrl(v)}
                    target="_blank"
                    rel="noreferrer noopener"
                    aria-label={`Open ${v.name} on YouTube`}
                    title="Open on YouTube"
                  >
                    <ExternalLink size={14} />
                  </a>
                  <IconButton
                    label={`Remove ${v.name}`}
                    size="sm"
                    className="task__delete"
                    onClick={() => remove(v.id)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                </div>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  )
}
