import { Camera, History, ImageOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDayShort, type DateKey } from '../../lib/date.ts'
import { formatDelta } from '../../lib/format.ts'
import {
  formatWeight,
  slidesOf,
  toUnit,
  type PhotoKey,
  type WeightUnit,
} from '../../lib/weight.ts'
import { useWeights } from '../../state/useWeights.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { PhotoGrid } from './PhotoGrid.tsx'
import { PhotoPreview } from './PhotoPreview.tsx'
import { usePhotoPicker } from './usePhotoPicker.tsx'
import { useWindowedRows } from './useWindowedRows.ts'
import { WeightEditor } from './WeightEditor.tsx'

interface WeightHistoryProps {
  today: DateKey
  unit: WeightUnit
}

interface HistoryRow {
  date: DateKey
  kg: number | null
  photos: readonly PhotoKey[]
  /** Change from the weigh-in before it, in kg. */
  change: number | null
}

const icon = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

/**
 * Every weigh-in in date order (newest first, never sorted by weight).
 * Click one to edit its weight or photo, or delete it.
 */
export function WeightHistory({ today, unit }: WeightHistoryProps) {
  const { log, setWeight, removePhoto, removeAllPhotos, deleteEntry } =
    useWeights()
  const [openDate, setOpenDate] = useState<DateKey | null>(null)
  const [previewPhoto, setPreviewPhoto] = useState<PhotoKey | null>(null)
  const photos = usePhotoPicker((old, key) =>
    setPreviewPhoto((shown) => (shown === old ? key : shown)),
  )

  // One pass, oldest first, carrying the last weigh-in along.
  const rows = useMemo(() => {
    const out: HistoryRow[] = []
    let previousKg: number | null = null
    for (const date of Object.keys(log).sort()) {
      const { kg, photos } = log[date]
      const change = kg !== null && previousKg !== null ? kg - previousKg : null
      out.push({ date, kg, photos, change })
      if (kg !== null) previousKg = kg
    }
    return out.reverse()
  }, [log])

  // Every photo, oldest first, for the slideshow; only worked out while open.
  const previewing = previewPhoto !== null
  const slides = useMemo(
    () => (previewing ? slidesOf(log) : []),
    [log, previewing],
  )
  const close = () => setOpenDate(null)
  const { scrollerRef, onScroll, measureRow, range } = useWindowedRows(
    rows.length,
    rows.findIndex((row) => row.date === openDate),
  )

  return (
    <section className="history" aria-labelledby="history-heading">
      <h3 id="history-heading" className="history__heading">
        <History size={20} strokeWidth={1.75} aria-hidden="true" /> Weight
        history
        <span className="history__count">{rows.length}</span>
      </h3>

      {rows.length === 0 ? (
        <p className="history__empty">No weigh-ins yet.</p>
      ) : (
        <div
          ref={scrollerRef}
          className="history__list sketch-scroll"
          onScroll={onScroll}
        >
          <ol
            className="history__rows"
            style={{ paddingTop: range.padTop, paddingBottom: range.padBottom }}
          >
            {rows.slice(range.start, range.end + 1).map((row, offset) => {
              const index = range.start + offset
              const open = row.date === openDate
              return (
                <li
                  key={row.date}
                  ref={measureRow(index)}
                  aria-posinset={index + 1}
                  aria-setsize={rows.length}
                  className={
                    open ? 'history__item history__item--open' : 'history__item'
                  }
                >
                  <div className="history__line">
                    <button
                      type="button"
                      className="history__row"
                      onClick={() => setOpenDate(open ? null : row.date)}
                      aria-expanded={open}
                      aria-label={`${formatDayShort(row.date)}: ${row.kg !== null ? formatWeight(row.kg, unit) : 'no weight'}. Edit`}
                    >
                      <span className="history__date">
                        {formatDayShort(row.date)}
                      </span>
                      <span className="history__kg">
                        {row.kg !== null ? formatWeight(row.kg, unit) : '—'}
                      </span>
                      <span className="history__change">
                        {row.change !== null &&
                          formatDelta(toUnit(row.change, unit))}
                      </span>
                    </button>
                    {row.photos.length > 0 && (
                      <button
                        type="button"
                        className="history__thumb"
                        onClick={() => setPreviewPhoto(row.photos[0])}
                        aria-label={
                          row.photos.length > 1
                            ? `Open ${row.photos.length} photos for ${formatDayShort(row.date)}`
                            : `Open photo for ${formatDayShort(row.date)}`
                        }
                      >
                        <PhotoGrid photos={row.photos} />
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="history__edit">
                      <WeightEditor
                        kg={row.kg}
                        unit={unit}
                        onSave={(kg) => {
                          setWeight(row.date, kg)
                          close()
                        }}
                        onCancel={close}
                        onRemove={() => {
                          close()
                          void deleteEntry(row.date)
                        }}
                        removeLabel="Delete entry"
                      />
                      <div className="history__photo-actions">
                        <SketchButton
                          variant="ghost"
                          onClick={() => photos.add(row.date)}
                          disabled={photos.busy || photos.room(row.date) === 0}
                        >
                          <Camera {...icon} />
                          Add photos
                        </SketchButton>
                        {row.photos.length > 0 && (
                          <SketchButton
                            variant="ghost"
                            onClick={() => void removeAllPhotos(row.date)}
                          >
                            <ImageOff {...icon} />
                            {row.photos.length > 1
                              ? `Remove ${row.photos.length} photos`
                              : 'Remove photo'}
                          </SketchButton>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              )
            })}
          </ol>
        </div>
      )}

      {photos.status && <p className="weight__status">{photos.status}</p>}
      {photos.error && (
        <p className="weight__error" role="alert">
          {photos.error}
        </p>
      )}

      <PhotoPreview
        photo={previewPhoto}
        slides={slides}
        log={log}
        unit={unit}
        today={today}
        onShow={setPreviewPhoto}
        onClose={() => setPreviewPhoto(null)}
        onReplace={(slide) => photos.replace(slide.date, slide.photo)}
        onRemove={(slide) => void removePhoto(slide.date, slide.photo)}
      />
      {photos.input}
    </section>
  )
}
