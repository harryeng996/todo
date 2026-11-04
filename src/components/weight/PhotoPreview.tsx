import { Camera, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type PointerEvent,
} from 'react'
import { relativeDayLabel, type DateKey } from '../../lib/date.ts'
import {
  formatWeight,
  type PhotoKey,
  type Slide,
  type WeightLog,
  type WeightUnit,
} from '../../lib/weight.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { usePhotoUrl } from './usePhotoUrl.ts'

interface PhotoPreviewProps {
  /** The photo being shown, or null when closed. */
  photo: PhotoKey | null
  /** All photos that can be slid through, in order. */
  slides: readonly Slide[]
  log: WeightLog
  unit: WeightUnit
  today: DateKey
  onShow: (photo: PhotoKey) => void
  onClose: () => void
  onReplace: (slide: Slide) => void
  onRemove: (slide: Slide) => void
}

const icon = { size: 20, strokeWidth: 1.75, 'aria-hidden': true } as const
/** How far a swipe must travel to change photo (px). */
const SWIPE_PX = 40

/**
 * Large view of one photo that slides to the previous / next one (buttons,
 * arrow keys or a swipe), with the photo actions.
 */
export function PhotoPreview({
  photo,
  slides,
  log,
  unit,
  today,
  onShow,
  onClose,
  onReplace,
  onRemove,
}: PhotoPreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const swipe = useRef<{ x: number; y: number } | null>(null)
  // Which way the last change went, so the photo slides in from that side.
  const [direction, setDirection] = useState<'back' | 'forward' | null>(null)
  const index = photo ? slides.findIndex((slide) => slide.photo === photo) : -1
  const slide = index >= 0 ? slides[index] : null
  const previous = index > 0 ? slides[index - 1] : null
  const next = index >= 0 ? (slides[index + 1] ?? null) : null
  const open = slide !== null

  const url = usePhotoUrl(slide?.photo ?? null, 'full')
  // The neighbours load too, so sliding to them shows them at once.
  const previousUrl = usePhotoUrl(previous?.photo ?? null, 'full')
  const nextUrl = usePhotoUrl(next?.photo ?? null, 'full')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  function go(to: Slide | null, way: 'back' | 'forward') {
    if (!to) return
    setDirection(way)
    onShow(to.photo)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'ArrowLeft') go(previous, 'back')
    if (event.key === 'ArrowRight') go(next, 'forward')
  }

  // A click on the backdrop lands on the <dialog> itself.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose()
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = swipe.current
    swipe.current = null
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    if (Math.abs(dx) < SWIPE_PX || Math.abs(dx) < Math.abs(dy)) return
    if (dx > 0) go(previous, 'back')
    else go(next, 'forward')
  }

  function remove(gone: Slide) {
    // Stay in the slideshow: show the next photo, or the previous at the end.
    const after = next ?? previous
    if (after) onShow(after.photo)
    else onClose()
    onRemove(gone)
  }

  const kg = slide ? log[slide.date]?.kg : null
  const label = slide ? relativeDayLabel(slide.date, today) : ''
  // Position among the day's photos (slides keep a day's photos together).
  let first = index
  while (slide && first > 0 && slides[first - 1].date === slide.date) first--
  let last = index
  while (
    slide &&
    last < slides.length - 1 &&
    slides[last + 1].date === slide.date
  )
    last++
  const ofDay = last - first + 1

  return (
    <dialog
      ref={dialogRef}
      className="photo-preview"
      aria-label={`Photo for ${label}`}
      onClose={onClose}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {slide && (
        <SketchBox seed={83} className="photo-preview__box">
          <header className="photo-preview__header">
            <h2 className="photo-preview__title">
              {label}
              {kg != null && (
                <span className="photo-preview__kg">
                  {formatWeight(kg, unit)}
                </span>
              )}
              {ofDay > 1 && (
                <span className="photo-preview__count">
                  {index - first + 1} / {ofDay}
                </span>
              )}
            </h2>
            <SketchButton
              variant="ghost"
              onClick={onClose}
              aria-label="Close photo"
            >
              <X {...icon} />
            </SketchButton>
          </header>
          <div
            className="photo-preview__stage"
            onPointerDown={(event) =>
              (swipe.current = { x: event.clientX, y: event.clientY })
            }
            onPointerUp={handlePointerUp}
            onPointerCancel={() => (swipe.current = null)}
          >
            {url && (
              <img
                key={slide.photo}
                className={
                  direction
                    ? `photo-preview__image photo-preview__image--${direction}`
                    : 'photo-preview__image'
                }
                src={url}
                alt={
                  ofDay > 1
                    ? `Photo ${index - first + 1} of ${ofDay} for ${label}`
                    : `Photo for ${label}`
                }
                draggable={false}
              />
            )}
            {previousUrl && <img hidden src={previousUrl} alt="" />}
            {nextUrl && <img hidden src={nextUrl} alt="" />}
          </div>
          <footer className="photo-preview__actions">
            <SketchButton
              variant="ghost"
              onClick={() => go(previous, 'back')}
              disabled={!previous}
              aria-label="Previous photo"
            >
              <ChevronLeft {...icon} />
            </SketchButton>
            <SketchButton
              variant="ghost"
              onClick={() => go(next, 'forward')}
              disabled={!next}
              aria-label="Next photo"
            >
              <ChevronRight {...icon} />
            </SketchButton>
            <span className="photo-preview__spacer" />
            <SketchButton variant="ghost" onClick={() => onReplace(slide)}>
              <Camera {...icon} />
              Replace
            </SketchButton>
            <SketchButton
              variant="ghost"
              className="photo-preview__remove"
              onClick={() => remove(slide)}
            >
              <Trash2 {...icon} />
              Remove
            </SketchButton>
          </footer>
        </SketchBox>
      )}
    </dialog>
  )
}
