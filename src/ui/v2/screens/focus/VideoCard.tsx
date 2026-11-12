import { Link2, MonitorPlay, Plus, SlidersHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { MAX_LENGTH } from '../../../../lib/limits.ts'
import { useVideos } from '../../../../state/useVideos.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { navigate } from '../../lib/router.ts'
import { useVideoDock } from '../../state/videoDock.ts'

/** Background videos: the slot the app-wide player docks into, and the saved list. */
export function VideoCard() {
  const { videos, current, add } = useVideos()
  const { setSlot, play, playing } = useVideoDock()
  const [adding, setAdding] = useState(videos.length === 0)
  const [link, setLink] = useState('')
  const [name, setName] = useState('')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const problem = add(link, name)
    if (problem) {
      setError(problem)
      return
    }
    setLink('')
    setName('')
    setError('')
    setAdding(false)
  }

  return (
    <Card
      className="video-card"
      icon={<MonitorPlay size={16} />}
      title="Focus soundtrack"
      subtitle={
        playing
          ? 'Playing — keeps going on other screens'
          : 'Music or ambience while you work'
      }
      action={
        <>
          <IconButton
            label="Add a YouTube link"
            size="sm"
            onClick={() => setAdding((a) => !a)}
          >
            <Plus size={17} />
          </IconButton>
          <IconButton
            label="Manage videos"
            size="sm"
            onClick={() => navigate('settings', 'videos')}
          >
            <SlidersHorizontal size={15} />
          </IconButton>
        </>
      }
    >
      <AnimatePresence initial={false}>
        {adding && (
          <motion.form
            className="video-add"
            onSubmit={submit}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <div className="video-add__fields">
              <label className="video-add__link">
                <Link2 size={16} aria-hidden="true" />
                <input
                  className="input"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  placeholder="Paste a YouTube link or embed code"
                  aria-label="YouTube link"
                  required
                />
              </label>
              <input
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Name (optional)"
                aria-label="Video name"
                maxLength={MAX_LENGTH.name}
              />
              <Button type="submit" variant="primary">
                Add
              </Button>
            </div>
            {error && <p className="field-error">{error}</p>}
          </motion.form>
        )}
      </AnimatePresence>

      {current ? (
        // The app-wide player is positioned over this box.
        <div ref={setSlot} className="video-slot" />
      ) : (
        !adding && (
          <p className="empty">
            No videos yet. Add a YouTube link to play while you focus.
          </p>
        )
      )}

      {videos.length > 1 && (
        <div className="video-chips" role="list" aria-label="Saved videos">
          {videos.map((v) => (
            <button
              key={v.id}
              type="button"
              role="listitem"
              className={`video-chip ${v.id === current?.id ? 'is-current' : ''}`}
              onClick={() => play(v.id)}
              aria-current={v.id === current?.id ? 'true' : undefined}
            >
              {v.name}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}
