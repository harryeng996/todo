import { X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import {
  useEffect,
  useId,
  useRef,
  type KeyboardEvent,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { IconButton } from './Button.tsx'

interface SheetProps {
  open: boolean
  onClose: () => void
  title: ReactNode
  description?: ReactNode
  children: ReactNode
  footer?: ReactNode
  /** 'side' slides in from the right on wide screens; both are bottom sheets on phones. */
  variant?: 'side' | 'center'
  wide?: boolean
}

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

/** A modal panel. Escape and the backdrop close it; focus stays inside and returns after. */
export function Sheet({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  variant = 'center',
  wide = false,
}: SheetProps) {
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  const returnTo = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!open) return
    returnTo.current = document.activeElement as HTMLElement | null
    const panel = panelRef.current
    const first =
      panel?.querySelector<HTMLElement>('[data-autofocus]') ??
      panel?.querySelector<HTMLElement>(FOCUSABLE)
    first?.focus()
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = overflow
      returnTo.current?.focus?.()
    }
  }, [open])

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onClose()
      return
    }
    if (event.key !== 'Tab') return
    const items = [
      ...(panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? []),
    ]
    if (!items.length) return
    const first = items[0]
    const last = items.at(-1)!
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  const fromSide = variant === 'side'

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className={`sheet sheet--${variant}`} onKeyDown={handleKey}>
          <motion.div
            className="sheet__backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className={`sheet__panel ${wide ? 'sheet__panel--wide' : ''}`}
            initial={
              fromSide
                ? { x: 40, opacity: 0 }
                : { y: 24, opacity: 0, scale: 0.98 }
            }
            animate={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            exit={
              fromSide
                ? { x: 40, opacity: 0 }
                : { y: 24, opacity: 0, scale: 0.98 }
            }
            transition={{ type: 'spring', stiffness: 420, damping: 36 }}
          >
            <header className="sheet__header">
              <div>
                <h2 id={titleId}>{title}</h2>
                {description && (
                  <p className="sheet__description">{description}</p>
                )}
              </div>
              <IconButton label="Close" onClick={onClose} size="sm">
                <X size={18} aria-hidden="true" />
              </IconButton>
            </header>
            <div className="sheet__body scroll">{children}</div>
            {footer && <footer className="sheet__footer">{footer}</footer>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
