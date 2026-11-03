import { Camera, History, ImageOff } from 'lucide-react'
import { useMemo, useState } from 'react'
import { formatDayShort, type DateKey } from '../../lib/date.ts'
import { formatDelta } from '../../lib/format.ts'
import { formatWeight, toUnit, type WeightUnit } from '../../lib/weight.ts'
import { useWeights } from '../../state/useWeights.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { PhotoPreview } from './PhotoPreview.tsx'
import { usePhotoPicker } from './usePhotoPicker.tsx'
import { usePhotoUrls } from './usePhotoUrls.ts'
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
  const { log, photoVersion, setWeight, removePhoto, deleteEntry } =
    useWeights()
  const photos = usePhotoPicker()
  const [openDate, setOpenDate] = useState<DateKey | null>(null)
  const [previewDate, setPreviewDate] = useState<DateKey | null>(null)

  const rows = useMemo(() => {
    const dates = Object.keys(log).sort()
    const weighIns = dates.filter((date) => log[date].kg !== null)
    return dates
      .map((date): HistoryRow => {
        const { kg, hasPhoto } = log[date]
        const before = weighIns.findLast((d) => d < date)
        const change = kg !== null && before ? kg - log[before].kg! : null
        return { date, kg, hasPhoto, change }
      })
      .reverse()
  }, [log])

  const photoDates = rows
    .filter((row) => row.hasPhoto)
    .map((row) => row.date)
    .reverse()
  const photoUrls = usePhotoUrls(photoDates, photoVersion)
  const close = () => setOpenDate(null)

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
        <ol className="history__list sketch-scroll">
          {rows.map((row) => {
            const open = row.date === openDate
            return (
              <li
                key={row.date}
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
                  {row.hasPhoto && photoUrls[row.date] && (
                    <button
                      type="button"
                      className="history__thumb"
                      onClick={() => setPreviewDate(row.date)}
                      aria-label={`Open photo for ${formatDayShort(row.date)}`}
                    >
                      <img src={photoUrls[row.date]} alt="" />
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
        urls={photoUrls}
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
