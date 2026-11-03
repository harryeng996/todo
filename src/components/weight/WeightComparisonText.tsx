import { formatDayShort, type DateKey } from '../../lib/date.ts'
import { formatDelta } from '../../lib/format.ts'
import {
  formatWeight,
  toUnit,
  weightComparison,
  type WeightLog,
  type WeightUnit,
} from '../../lib/weight.ts'

interface WeightComparisonTextProps {
  log: WeightLog
  date: DateKey
  unit: WeightUnit
}

/** The day's (or latest earlier) weigh-in against the previous entry and the 10 days before. */
export function WeightComparisonText({
  log,
  date,
  unit,
}: WeightComparisonTextProps) {
  const { current, previous, average10 } = weightComparison(log, date)
  if (!current) return <p className="stats">No weigh-ins to compare yet.</p>

  const change = (kg: number) =>
    `${formatDelta(toUnit(current.kg, unit) - toUnit(kg, unit))} ${unit}`

  return (
    <ul className="stats">
      {current.date !== date && (
        <li>
          Latest: {formatWeight(current.kg, unit)} (
          {formatDayShort(current.date)})
        </li>
      )}
      <li>
        {previous ? (
          <>
            vs previous entry ({formatDayShort(previous.date)}):{' '}
            <strong>{change(previous.kg)}</strong>
          </>
        ) : (
          'First weigh-in, nothing to compare yet.'
        )}
      </li>
      <li>
        {average10 !== null ? (
          <>
            vs last 10 days (avg {formatWeight(average10, unit)}):{' '}
            <strong>{change(average10)}</strong>
          </>
        ) : (
          'No weigh-ins in the 10 days before.'
        )}
      </li>
    </ul>
  )
}
