import { X } from 'lucide-react'
import { quotes } from '../../data/quotes.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { useFitText } from './useFitText.ts'
import { useQuotes } from './useQuotes.ts'

/** A sticky note with one quote; dismissing it shows the next. Long quotes get smaller text. */
export function QuoteCard() {
  const { quote, next } = useQuotes(quotes)
  const textRef = useFitText<HTMLQuoteElement>({ max: 30, min: 15 }, quote.text)

  return (
    <SketchBox seed={23} className="quote-card" filled>
      <figure key={quote.text} className="quote-card__body">
        <blockquote ref={textRef} className="quote-card__text">
          “{quote.text}”
        </blockquote>
        <figcaption className="quote-card__author">— {quote.author}</figcaption>
      </figure>
      <SketchButton
        variant="ghost"
        className="quote-card__next"
        onClick={next}
        aria-label="Next quote"
        title="Next quote"
      >
        <X size={20} strokeWidth={1.75} aria-hidden="true" />
      </SketchButton>
    </SketchBox>
  )
}
