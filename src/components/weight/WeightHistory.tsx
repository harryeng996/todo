import { Camera, History, ImageOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDayShort, type DateKey } from '../../lib/date.ts'
import { formatDelta } from '../../lib/format.ts'
import { formatWeight, toUnit, type WeightUnit } from '../../lib/weight.ts'
import { useWeights } from '../../state/useWeights.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { PhotoPreview } from './PhotoPreview.tsx'
import { usePhotoPicker } from './usePhotoPicker.tsx'
import { useWindowedRows } from './useWindowedRows.ts'
import { PhotoThumb } from './PhotoThumb.tsx'
import { WeightEditor } from './WeightEditor.tsx'

interface WeightHistoryProps {
  today: DateKey
  unit: WeightUnit
}

interface HistoryRow {
  date: DateKey
  kg: number | null
  hasPhoto: boolean
  /** Change from the weigh-in before it, in kg. */
  change: number | null
}

const icon = { size: 16, strokeWidth: 1.75, 'aria-hidden': true } as const

/**
 * Every weigh-in in date order (newest first, never sorted by weight).
 * Click one to edit its weight or photo, or delete it.
 */
export function WeightHistory({ today, unit }: WeightHistoryProps) {
  const { log, photoVersions, setWeight, removePhoto, deleteEntry } =
    useWeights()
  const photos = usePhotoPicker()
  const [openDate, setOpenDate] = useState<DateKey | null>(null)
  const [previewDate, setPreviewDate] = useState<DateKey | null>(null)

  // One pass, oldest first, carrying the last weigh-in along.
  const rows = useMemo(() => {
    const out: HistoryRow[] = []
    let previousKg: number | null = null
    for (const date of Object.keys(log).sort()) {
      const { kg, hasPhoto } = log[date]
      const change = kg !== null && previousKg !== null ? kg - previousKg : null
      out.push({ date, kg, hasPhoto, change })
      if (kg !== null) previousKg = kg
    }
    return out.reverse()
  }, [log])

  const photoDates = rows
    .filter((row) => row.hasPhoto)
    .map((row) => row.date)
    .reverse()
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
                    {row.hasPhoto && (
                      <button
                        type="button"
                        className="history__thumb"
                        onClick={() => setPreviewDate(row.date)}
                        aria-label={`Open photo for ${formatDayShort(row.date)}`}
                      >
                        <PhotoThumb
                          date={row.date}
                          version={photoVersions[row.date] ?? 0}
                        />
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
                          onClick={() => photos.pick(row.date)}
                          disabled={photos.busy}
                        >
                          <Camera {...icon} />
                          {row.hasPhoto ? 'Replace photo' : 'Add photo'}
                        </SketchButton>
                        {row.hasPhoto && (
                          <SketchButton
                            variant="ghost"
                            onClick={() => void removePhoto(row.date)}
                          >
                            <ImageOff {...icon} />
                            Remove photo
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

      {photos.busy && <p className="weight__status">Saving photo…</p>}
      {photos.error && (
        <p className="weight__error" role="alert">
          {photos.error}
        </p>
      )}

      <PhotoPreview
        date={previewDate}
        dates={photoDates}
        version={previewDate ? (photoVersions[previewDate] ?? 0) : 0}
        log={log}
        unit={unit}
        today={today}
        onShow={setPreviewDate}
        onClose={() => setPreviewDate(null)}
        onReplace={photos.pick}
        onRemove={(date) => {
          setPreviewDate(null)
          void removePhoto(date)
        }}
      />
      {photos.input}
    </section>
  )
}
