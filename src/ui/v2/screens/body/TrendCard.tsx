import { useState } from 'react'
import {
  addDays,
  relativeDayLabel,
  type DateKey,
} from '../../../../lib/date.ts'
import type { WeightUnit } from '../../../../lib/weight.ts'
import { AreaChart } from '../../charts/AreaChart.tsx'
import { AnimatedNumber } from '../../components/AnimatedNumber.tsx'
import { Card } from '../../components/Card.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { Delta } from '../../components/StatTile.tsx'
import {
  average,
  movingAverage,
  weeklyRate,
  type DayValue,
} from '../../lib/stats.ts'

type Range = '7' | '30' | '90' | '182' | '365' | 'all'

const RANGES = [
  { value: '7', label: '1W' },
  { value: '30', label: '1M' },
  { value: '90', label: '3M' },
  { value: '182', label: '6M' },
  { value: '365', label: '1Y' },
  { value: 'all', label: 'All' },
] as const

interface TrendCardProps {
  /** Every weigh-in in the display unit, oldest first. */
  points: DayValue[]
  today: DateKey
  unit: WeightUnit
}

const one = (v: number) => v.toFixed(1)

/** The headline number and the weight chart with a 7-day average line. */
export function TrendCard({ points, today, unit }: TrendCardProps) {
  const [range, setRange] = useState<Range>('90')
  const latest = points.at(-1)
  const previous = points.at(-2)
  const from =
    range === 'all'
      ? (points[0]?.date ?? addDays(today, -29))
      : addDays(today, -(Number(range) - 1))
  const shown = points.filter((p) => p.date >= from)
  const trend = movingAverage(points, 7).filter((p) => p.date >= from)
  const values = shown.map((p) => p.value)
  const change = shown.length > 1 ? shown.at(-1)!.value - shown[0].value : null
  const rate = weeklyRate(shown)

  return (
    <Card className="trend">
      <div className="trend__head">
        <div>
          <p className="trend__label">Current weight</p>
          <div className="trend__value">
            {latest ? (
              <AnimatedNumber value={latest.value} format={one} />
            ) : (
              '—'
            )}
            <span>{unit}</span>
          </div>
          <div className="trend__meta">
            <Delta
              change={latest && previous ? latest.value - previous.value : null}
              format={one}
              good="none"
              suffix={
                previous ? 'since the weigh-in before' : 'no earlier weigh-in'
              }
            />
            {latest && (
              <span className="subtle">
                {' '}
                · {relativeDayLabel(latest.date, today)}
              </span>
            )}
          </div>
        </div>
        <Segmented
          label="Chart range"
          size="sm"
          options={RANGES}
          value={range}
          onChange={setRange}
        />
      </div>

      <AreaChart
        key={range}
        label={`Weight trend chart (${unit})`}
        points={shown}
        overlay={trend}
        overlayLabel="7-day avg"
        from={from}
        to={today}
        format={one}
        color="var(--body)"
        height={260}
      />
      <div className="trend__legend" aria-hidden="true">
        <span>
          <i className="trend__swatch" /> Weigh-ins
        </span>
        <span>
          <i className="trend__swatch trend__swatch--dash" /> 7-day average
        </span>
      </div>

      <dl className="trend__stats">
        <div>
          <dt>Average</dt>
          <dd className="num">
            {values.length ? `${one(average(values)!)} ${unit}` : '—'}
          </dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd className="num">
            {change === null
              ? '—'
              : `${change > 0 ? '+' : change < 0 ? '−' : '±'}${one(Math.abs(change))} ${unit}`}
          </dd>
        </div>
        <div>
          <dt>Lowest</dt>
          <dd className="num">
            {values.length ? `${one(Math.min(...values))} ${unit}` : '—'}
          </dd>
        </div>
        <div>
          <dt>Highest</dt>
          <dd className="num">
            {values.length ? `${one(Math.max(...values))} ${unit}` : '—'}
          </dd>
        </div>
        <div>
          <dt>Per week</dt>
          <dd className="num">
            {rate === null
              ? '—'
              : `${rate > 0 ? '+' : rate < 0 ? '−' : '±'}${Math.abs(rate).toFixed(2)} ${unit}`}
          </dd>
        </div>
        <div>
          <dt>Weigh-ins</dt>
          <dd className="num">{shown.length}</dd>
        </div>
      </dl>
    </Card>
  )
}
