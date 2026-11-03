import { SlidersHorizontal, X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useQuoteLibrary } from '../../state/useQuoteLibrary.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { useFitText } from './useFitText.ts'

function usePageVisible(): boolean {
  const [visible, setVisible] = useState(
    () => document.visibilityState !== 'hidden',
  )
  useEffect(() => {
    const update = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', update)
    return () => document.removeEventListener('visibilitychange', update)
  }, [])
  return visible
}

function isFocusVisible(element: Element): boolean {
  try {
    return element.matches(':focus-visible')
  } catch {
    return true // very old browsers: treat any focus as keyboard focus
  }
}

interface QuoteCardProps {
  /** Opens the quote settings. */
  onConfigure: () => void
}

/**
 * A sticky note with one quote. It rotates on a timer (paused while you hover
 * or focus it, or the tab is hidden); × shows the next one straight away.
 * Long quotes get smaller text.
 */
export function QuoteCard({ onConfigure }: QuoteCardProps) {
  const { current, next, library } = useQuoteLibrary()
  const textRef = useFitText<HTMLQuoteElement>(
    { max: 30, min: 15 },
    current?.text,
  )
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const visible = usePageVisible()
  const currentId = current?.id
  const paused = hovered || focused || !visible

  // Restarts whenever the quote changes, so a manual "next" gets a full interval too.
  useEffect(() => {
    if (!library.rotate || paused || !currentId) return
    const timer = setTimeout(next, library.intervalSec * 1000)
    return () => clearTimeout(timer)
  }, [library.rotate, library.intervalSec, paused, currentId, next])

  return (
    <SketchBox
      seed={23}
      className="quote-card"
      filled
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      // Keyboard focus pauses (someone is reading); a mouse click on × leaves
      // focus on the button and shouldn't stop the rotation.
      onFocus={(event) => setFocused(isFocusVisible(event.target))}
      onBlur={() => setFocused(false)}
    >
      {current ? (
        <figure key={current.id} className="quote-card__body">
          <blockquote ref={textRef} className="quote-card__text">
            “{current.text}”
          </blockquote>
          <figcaption className="quote-card__author">
            — {current.author}
          </figcaption>
        </figure>
      ) : (
        <p className="quote-card__empty">
          No quotes in rotation. Add your own or switch some on in quote
          settings.
        </p>
      )}
      <div className="quote-card__actions">
        <SketchButton
          variant="ghost"
          onClick={onConfigure}
          aria-label="Quote settings"
          title="Quote settings"
        >
          <SlidersHorizontal size={18} strokeWidth={1.75} aria-hidden="true" />
        </SketchButton>
        <SketchButton
          variant="ghost"
          onClick={next}
          aria-label="Next quote"
          title="Next quote"
          disabled={!current}
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </SketchButton>
      </div>
    </SketchBox>
  )
}
