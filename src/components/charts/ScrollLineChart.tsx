import {
  addDays,
  daysBetween,
  formatDayMonth,
  type DateKey,
} from '../../lib/date.ts'
import { sketchOptions, useRough } from '../sketch/useRough.ts'

export interface ChartPoint {
  date: DateKey
  value: number
}

interface ScrollLineChartProps {
  /** Oldest first; days without a point are simply skipped by the line. */
  points: ChartPoint[]
  start: DateKey
  end: DateKey
  /** Accessible description of what the chart shows. */
  label: string
  format: (value: number) => string
  selectedDate?: DateKey
  /** Start the value axis at zero (counts) instead of just below the minimum. */
  fromZero?: boolean
  pxPerDay?: number
  height?: number
  seed?: number
}

const PAD = 8

/**
 * Hand-drawn line chart with a fixed width per day. Long histories scroll
 * sideways; it opens at the latest day (right end).
 */
export function ScrollLineChart({
  points,
  start,
  end,
  label,
  format,
  selectedDate,
  fromZero = false,
  pxPerDay = 16,
  height = 110,
  seed = 101,
}: ScrollLineChartProps) {
  const span = Math.max(daysBetween(start, end), 1)
  const values = points.map((p) => p.value)
  const min = fromZero ? 0 : Math.min(...values)
  const max = Math.max(...values)
  // Keep a flat line off the edges.
  const margin = fromZero ? 0 : Math.max((max - min) * 0.15, 0.5)
  const low = min - margin
  const high = Math.max(max + margin, low + 1)
  const fraction = (date: DateKey) => daysBetween(start, date) / span

  const svgRef = useRough(
    (rc, width, h) => {
      if (points.length < 2) return []
      const xy = points.map(({ date, value }): [number, number] => [
        PAD + fraction(date) * (width - 2 * PAD),
        PAD + (1 - (value - low) / (high - low)) * (h - 2 * PAD),
      ])
      const line = rc.linearPath(xy, {
        ...sketchOptions,
        strokeWidth: 1.5,
        seed,
      })
      const dots = xy.map(([x, y], i) => {
        const dot = rc.circle(x, y, 6, {
          ...sketchOptions,
          strokeWidth: 1,
          fill: 'currentColor',
          fillStyle: 'solid',
          seed: seed + 1 + (i % 50),
        })
        if (points[i].date === selectedDate)
          dot.setAttribute('class', 'scroll-chart__selected')
        return dot
      })
      return [line, ...dots]
    },
    `${start}|${end}|${points.map((p) => `${p.date}:${p.value}`).join()}|${selectedDate}`,
  )

  if (points.length < 2) {
    return (
      <p className="scroll-chart__empty">Not enough data for a chart yet.</p>
    )
  }

  // A date label every 7 days, lined up so the last one falls on `end`.
  const ticks = Array.from(
    { length: Math.floor(span / 7) + 1 },
    (_, i) => span - i * 7,
  )
    .reverse()
    .map((offset) => ({ offset, date: formatDayMonth(addDays(start, offset)) }))

  return (
    <div className="scroll-chart" role="img" aria-label={label}>
      <div className="scroll-chart__axis" aria-hidden="true">
        <span>{format(max)}</span>
        <span>{format(min)}</span>
      </div>
      <div className="scroll-chart__scroll">
        <div
          className="scroll-chart__content"
          style={{ width: `max(${(span + 1) * pxPerDay}px, 100%)` }}
        >
          <div className="scroll-chart__plot" style={{ height }}>
            <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
          </div>
          <div className="scroll-chart__ticks" aria-hidden="true">
            {ticks.map(({ offset, date }) => (
              <span
                key={offset}
                style={{
                  left: `calc(${PAD}px + ${offset / span} * (100% - ${2 * PAD}px))`,
                }}
              >
                {date}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
