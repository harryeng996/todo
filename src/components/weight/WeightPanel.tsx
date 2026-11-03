import { Camera, Pencil } from 'lucide-react'
import { useMemo, useState } from 'react'
import { addDays, relativeDayLabel, type DateKey } from '../../lib/date.ts'
import {
  chartPoints,
  formatWeight,
  toUnit,
  type WeightUnit,
} from '../../lib/weight.ts'
import { useWeights } from '../../state/useWeights.ts'
import { ScrollLineChart } from '../charts/ScrollLineChart.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { PhotoPreview } from './PhotoPreview.tsx'
import { usePhotoPicker } from './usePhotoPicker.tsx'
import { usePhotoUrls } from './usePhotoUrls.ts'
import { WeightComparisonText } from './WeightComparisonText.tsx'
import { WeightEditor } from './WeightEditor.tsx'
import { WeightHistory } from './WeightHistory.tsx'

interface WeightPanelProps {
  selectedDate: DateKey
  today: DateKey
  unit: WeightUnit
}

const icon = { size: 18, strokeWidth: 1.75, 'aria-hidden': true } as const

/** Plus feature: the selected day's weight and photo, the trend chart and comparisons. */
export function WeightPanel({ selectedDate, today, unit }: WeightPanelProps) {
  const { log, photoVersion, setWeight, removePhoto } = useWeights()
  const photos = usePhotoPicker()
  const entry = log[selectedDate]
  const kg = entry?.kg ?? null
  const hasPhoto = entry?.hasPhoto ?? false
  const dayLabel = relativeDayLabel(selectedDate, today)

  const [editing, setEditing] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)

  // Switching days closes the editor and the preview.
  const [shownDate, setShownDate] = useState(selectedDate)
  if (shownDate !== selectedDate) {
    setShownDate(selectedDate)
    setEditing(false)
    setPreviewOpen(false)
  }

  const photoUrls = usePhotoUrls(hasPhoto ? [selectedDate] : [], photoVersion)

  // Every weigh-in (up to a year), at least a two-week axis.
  const series = useMemo(() => {
    const points = chartPoints(log, today, 365)
    const first = points[0]?.date ?? today
    const twoWeeks = addDays(today, -13)
    return {
      start: first < twoWeeks ? first : twoWeeks,
      points: points.map((p) => ({ date: p.date, value: toUnit(p.kg, unit) })),
    }
  }, [log, today, unit])

  return (
    <section className="weight" aria-labelledby="weight-heading">
      <header className="weight__header">
        <h2 id="weight-heading" className="weight__heading">
          Weight · {dayLabel}
        </h2>
        <span className="weight__plus">plus</span>
        {!hasPhoto && (
          <SketchButton
            variant="ghost"
            className="weight__add-photo"
            onClick={() => photos.pick(selectedDate)}
            disabled={photos.busy}
            aria-label={`Add photo for ${dayLabel}`}
            title="Add photo"
          >
            <Camera size={20} strokeWidth={1.75} aria-hidden="true" />
          </SketchButton>
        )}
      </header>

      {editing ? (
        <WeightEditor
          kg={kg}
          unit={unit}
          onSave={(value) => {
            setWeight(selectedDate, value)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
          onRemove={
            kg !== null
              ? () => {
                  setWeight(selectedDate, null)
                  setEditing(false)
                }
              : undefined
          }
        />
      ) : (
        <div className="weight__value-row">
          {kg !== null ? (
            <span className="weight__value">{formatWeight(kg, unit)}</span>
          ) : (
            <span className="weight__none">No weigh-in</span>
          )}
          <SketchButton
            variant="ghost"
            onClick={() => setEditing(true)}
            aria-label={kg !== null ? 'Edit weight' : 'Log weight'}
            title={kg !== null ? 'Edit weight' : 'Log weight'}
          >
            <Pencil {...icon} />
          </SketchButton>
          {photoUrls[selectedDate] && (
            <button
              type="button"
              className="weight__thumb"
              onClick={() => setPreviewOpen(true)}
              aria-label={`Open photo for ${dayLabel}`}
            >
              <img src={photoUrls[selectedDate]} alt="" />
            </button>
          )}
        </div>
      )}

      {photos.busy && <p className="weight__status">Saving photo…</p>}
      {photos.error && (
        <p className="weight__error" role="alert">
          {photos.error}
        </p>
      )}

      <div className="weight__trend">
        <ScrollLineChart
          points={series.points}
          start={series.start}
          end={today}
          label={`Weight over time, ${series.points.length} weigh-ins`}
          format={(value) => `${value.toFixed(1)} ${unit}`}
          selectedDate={selectedDate}
          seed={71}
        />
        <WeightComparisonText log={log} date={selectedDate} unit={unit} />
      </div>

      <WeightHistory today={today} unit={unit} />

      <PhotoPreview
        date={previewOpen ? selectedDate : null}
        dates={[selectedDate]}
        urls={photoUrls}
        log={log}
        unit={unit}
        today={today}
        onShow={() => {}}
        onClose={() => setPreviewOpen(false)}
        onReplace={photos.pick}
        onRemove={(date) => {
          setPreviewOpen(false)
          void removePhoto(date)
        }}
      />
      {photos.input}
    </section>
  )
}
