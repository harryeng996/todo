import { useState } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { SketchInput } from '../sketch/SketchInput.tsx'
import {
  PRESET_LABELS,
  rangeProblem,
  resolveRange,
  type GridRange,
} from './useGridRange.ts'

interface GridRangeFilterProps {
  range: GridRange
  today: DateKey
  onChange: (range: GridRange) => void
}

/** Preset ranges, or a custom from–to (applied as soon as it's valid). */
export function GridRangeFilter({
  range,
  today,
  onChange,
}: GridRangeFilterProps) {
  const current = resolveRange(range, today)
  const [from, setFrom] = useState(current.from)
  const [to, setTo] = useState(current.to)
  const problem =
    range.preset === 'custom' ? rangeProblem(from, to, today) : null

  function choose(value: string) {
    if (value !== 'custom') {
      onChange({ preset: value as Exclude<GridRange['preset'], 'custom'> })
      return
    }
    // Start the custom range from what is on screen now.
    setFrom(current.from)
    setTo(current.to)
    onChange({ preset: 'custom', ...current })
  }

  function update(nextFrom: DateKey, nextTo: DateKey) {
    setFrom(nextFrom)
    setTo(nextTo)
    if (!rangeProblem(nextFrom, nextTo, today)) {
      onChange({ preset: 'custom', from: nextFrom, to: nextTo })
    }
  }

  return (
    <div className="grid-filter">
      <select
        className="grid-filter__select sketch-border--alt"
        value={range.preset}
        onChange={(event) => choose(event.target.value)}
        aria-label="Date range"
      >
        {Object.entries(PRESET_LABELS).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>
      {range.preset === 'custom' && (
        <div className="grid-filter__custom">
          <label className="grid-filter__field">
            From
            <SketchInput
              type="date"
              value={from}
              max={today}
              onChange={(event) => update(event.target.value, to)}
            />
          </label>
          <label className="grid-filter__field">
            To
            <SketchInput
              type="date"
              value={to}
              max={today}
              onChange={(event) => update(from, event.target.value)}
            />
          </label>
          {problem && (
            <p className="grid-filter__error" role="alert">
              {problem}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
