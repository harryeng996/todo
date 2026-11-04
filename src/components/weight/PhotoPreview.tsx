import { Camera, ChevronLeft, ChevronRight, Trash2, X } from 'lucide-react'
import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from 'react'
import { relativeDayLabel, type DateKey } from '../../lib/date.ts'
import {
  formatWeight,
  type WeightLog,
  type WeightUnit,
} from '../../lib/weight.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { usePhotoUrl } from './usePhotoUrl.ts'

interface PhotoPreviewProps {
  /** The photo being shown, or null when closed. */
  date: DateKey | null
  dates: DateKey[] // all photos that can be stepped through, oldest first
  /** Bumped when a photo is replaced, so the shown one reloads. */
  version: number
  log: WeightLog
  unit: WeightUnit
  today: DateKey
  onShow: (date: DateKey) => void
  onClose: () => void
  onReplace: (date: DateKey) => void
  onRemove: (date: DateKey) => void
}

const icon = { size: 20, strokeWidth: 1.75, 'aria-hidden': true } as const

/** Large view of one day's photo, with previous/next and the photo actions. */
export function PhotoPreview({
  date,
  dates,
  version,
  log,
  unit,
  today,
  onShow,
  onClose,
  onReplace,
  onRemove,
}: PhotoPreviewProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const open = date !== null
  const url = usePhotoUrl(date, version, 'full')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  const index = date ? dates.indexOf(date) : -1
  const previous = index > 0 ? dates[index - 1] : null
  const next = index >= 0 && index < dates.length - 1 ? dates[index + 1] : null

  function handleKeyDown(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key === 'ArrowLeft' && previous) onShow(previous)
    if (event.key === 'ArrowRight' && next) onShow(next)
  }

  // A click on the backdrop lands on the <dialog> itself.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose()
  }

  const kg = date ? log[date]?.kg : null
  const label = date ? relativeDayLabel(date, today) : ''

  return (
    <dialog
      ref={dialogRef}
      className="photo-preview"
      aria-label={`Photo for ${label}`}
      onClose={onClose}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
    >
      {date && (
        <SketchBox seed={83} className="photo-preview__box">
          <header className="photo-preview__header">
            <h2 className="photo-preview__title">
              {label}
              {kg != null && (
                <span className="photo-preview__kg">
                  {formatWeight(kg, unit)}
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
          {url && (
            <img
              className="photo-preview__image"
              src={url}
              alt={`Photo for ${label}`}
            />
          )}
          <footer className="photo-preview__actions">
            <SketchButton
              variant="ghost"
              onClick={() => previous && onShow(previous)}
              disabled={!previous}
              aria-label="Previous photo"
            >
              <ChevronLeft {...icon} />
            </SketchButton>
            <SketchButton
              variant="ghost"
              onClick={() => next && onShow(next)}
              disabled={!next}
              aria-label="Next photo"
            >
              <ChevronRight {...icon} />
            </SketchButton>
            <span className="photo-preview__spacer" />
            <SketchButton variant="ghost" onClick={() => onReplace(date)}>
              <Camera {...icon} />
              Replace
            </SketchButton>
            <SketchButton
              variant="ghost"
              className="photo-preview__remove"
              onClick={() => onRemove(date)}
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
