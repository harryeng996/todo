import { useState } from 'react'
import { daysBetween, formatDayShort } from '../../../../lib/date.ts'
import { formatDelta } from '../../../../lib/format.ts'
import {
  formatWeight,
  toUnit,
  type Slide,
  type WeightUnit,
} from '../../../../lib/weight.ts'
import { useWeights } from '../../../../state/useWeights.ts'
import { Sheet } from '../../components/Sheet.tsx'
import { Thumb } from '../../components/Thumb.tsx'

interface CompareSheetProps {
  open: boolean
  onClose: () => void
  /** Newest first. */
  slides: Slide[]
  unit: WeightUnit
}

/** Two photos on top of each other; drag the handle to wipe from one to the other. */
export function CompareSheet({
  open,
  onClose,
  slides,
  unit,
}: CompareSheetProps) {
  const { log } = useWeights()
  const [before, setBefore] = useState<string | null>(null)
  const [after, setAfter] = useState<string | null>(null)
  const [split, setSplit] = useState(50)
  // Default: the oldest photo against the newest.
  const a = slides.find((s) => s.photo === before) ?? slides.at(-1)
  const b = slides.find((s) => s.photo === after) ?? slides[0]
  if (!a || !b) return null

  const kgA = log[a.date]?.kg ?? null
  const kgB = log[b.date]?.kg ?? null
  const days = Math.abs(daysBetween(a.date, b.date))
  const option = (s: Slide, i: number) => (
    <option key={s.photo} value={s.photo}>
      {formatDayShort(s.date)}
      {log[s.date]?.kg != null
        ? ` · ${formatWeight(log[s.date].kg!, unit)}`
        : ''}
      {slides.filter((x) => x.date === s.date).length > 1 ? ` (#${i + 1})` : ''}
    </option>
  )

  return (
    <Sheet
      open={open}
      onClose={onClose}
      wide
      title="Before & after"
      description={`${days} ${days === 1 ? 'day' : 'days'} apart${
        kgA !== null && kgB !== null
          ? ` · ${formatDelta(toUnit(kgB - kgA, unit))} ${unit}`
          : ''
      }`}
    >
      <div className="compare">
        <div className="compare__pickers">
          <label>
            Before
            <select
              className="select"
              value={a.photo}
              onChange={(e) => setBefore(e.target.value)}
            >
              {slides.map(option)}
            </select>
          </label>
          <label>
            After
            <select
              className="select"
              value={b.photo}
              onChange={(e) => setAfter(e.target.value)}
            >
              {slides.map(option)}
            </select>
          </label>
        </div>
        <div
          className="compare__stage"
          style={{ ['--split' as string]: `${split}%` }}
        >
          <Thumb
            photo={a.photo}
            size="full"
            alt={`Before, ${formatDayShort(a.date)}`}
            className="thumb--contain"
          />
          <div className="compare__after">
            <Thumb
              photo={b.photo}
              size="full"
              alt={`After, ${formatDayShort(b.date)}`}
              className="thumb--contain"
            />
          </div>
          <span className="compare__handle" aria-hidden="true" />
          <span className="compare__tag compare__tag--before">
            {formatDayShort(a.date)}
          </span>
          <span className="compare__tag compare__tag--after">
            {formatDayShort(b.date)}
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={split}
            onChange={(e) => setSplit(Number(e.target.value))}
            aria-label="Before and after divider"
            className="compare__range"
          />
        </div>
      </div>
    </Sheet>
  )
}
