import { ChevronRight, Quote, SlidersHorizontal } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useQuoteLibrary } from '../../../../state/useQuoteLibrary.ts'
import { IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { navigate } from '../../lib/router.ts'

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

/** The current quote, cross-fading on the library's rotation timer (paused on hover). */
export function QuoteSpotlight() {
  const { current, next, library } = useQuoteLibrary()
  const [hovered, setHovered] = useState(false)
  const visible = usePageVisible()
  const currentId = current?.id

  useEffect(() => {
    if (!library.rotate || hovered || !visible || !currentId) return
    const timer = setTimeout(next, library.intervalSec * 1000)
    return () => clearTimeout(timer)
  }, [library.rotate, library.intervalSec, hovered, visible, currentId, next])

  const long = (current?.text.length ?? 0) > 160

  return (
    <Card
      className="quote"
      icon={<Quote size={16} />}
      title="Quote"
      action={
        <div className="quote__actions">
          <IconButton
            label="Quote settings"
            size="sm"
            onClick={() => navigate('settings', 'quotes')}
          >
            <SlidersHorizontal size={15} />
          </IconButton>
          <IconButton
            label="Next quote"
            size="sm"
            onClick={next}
            disabled={!current}
          >
            <ChevronRight size={17} />
          </IconButton>
        </div>
      }
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      <AnimatePresence mode="wait" initial={false}>
        {current ? (
          <motion.figure
            key={current.id}
            className="quote__figure"
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -8, filter: 'blur(4px)' }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          >
            <blockquote className={long ? 'is-long' : ''}>
              {current.text}
            </blockquote>
            {current.author && <figcaption>— {current.author}</figcaption>}
          </motion.figure>
        ) : (
          <p className="empty">No quotes in rotation. Add some in Settings.</p>
        )}
      </AnimatePresence>
      {library.rotate && current && !hovered && visible && (
        <motion.span
          key={current.id}
          className="quote__timer"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: library.intervalSec, ease: 'linear' }}
          aria-hidden="true"
        />
      )}
    </Card>
  )
}
