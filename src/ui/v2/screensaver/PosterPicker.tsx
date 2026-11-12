import '@fontsource/dm-serif-display/latin-400.css'
import '@fontsource/libre-caslon-text/latin-400.css'
import '@fontsource/libre-caslon-text/latin-400-italic.css'
import '@fontsource-variable/oswald'
import '@fontsource/patrick-hand/latin-400.css'
import './screensaver.css'
import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import { POSTER_IDS, type PosterId } from '../../../state/useSettings.ts'
import { POSTERS } from './posterRegistry.ts'
import { usePosterData } from './usePosterData.ts'

interface PosterPickerProps {
  selected: readonly PosterId[]
  onChange: (next: PosterId[]) => void
}

/** Live miniatures of each picture style, tap to include or leave out. */
export default function PosterPicker({
  selected,
  onChange,
}: PosterPickerProps) {
  const data = usePosterData()

  function toggle(id: PosterId) {
    const on = selected.includes(id)
    // Keep at least one in rotation.
    if (on && selected.length === 1) return
    onChange(POSTER_IDS.filter((p) => (p === id ? !on : selected.includes(p))))
  }

  return (
    <div
      className="poster-picker"
      role="group"
      aria-label="Pictures in rotation"
    >
      {POSTER_IDS.map((id) => {
        const { label, Component } = POSTERS[id]
        const on = selected.includes(id)
        return (
          <motion.button
            key={id}
            type="button"
            className={`poster-pick ${on ? 'is-on' : ''}`}
            aria-pressed={on}
            onClick={() => toggle(id)}
            whileHover={{ y: -3 }}
            whileTap={{ scale: 0.97 }}
          >
            <span className="poster-pick__frame">
              <span className="frame__paper">
                <Component data={data} round={0} />
              </span>
            </span>
            <span className="poster-pick__label">
              <span className="poster-pick__check" aria-hidden="true">
                {on && <Check size={12} strokeWidth={3} />}
              </span>
              {label}
            </span>
          </motion.button>
        )
      })}
    </div>
  )
}
