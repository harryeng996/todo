import { AnimatePresence, motion } from 'motion/react'
import { useId, useMemo, useState, type PointerEvent } from 'react'
import {
  addDays,
  daysBetween,
  formatDayMonth,
  formatDayShort,
  type DateKey,
} from '../../../lib/date.ts'
import { linear, niceTicks, smoothPath } from './scale.ts'
import { useWidth } from './useWidth.ts'

export interface SeriesPoint {
  date: DateKey
  value: number
}

interface AreaChartProps {
  points: readonly SeriesPoint[]
  /** First and last day on the x axis (points may be sparse). */
  from: DateKey
  to: DateKey
  format: (value: number) => string
  /** A second, dashed line, e.g. a moving average. */
  overlay?: readonly SeriesPoint[]
  overlayLabel?: string
  color?: string
  height?: number
  fromZero?: boolean
  label: string
  /** Highlight a day (e.g. the selected one). */
  marked?: DateKey
}

const PAD = { top: 16, right: 12, bottom: 26, left: 40 }

/** A smooth area chart with a hover/touch tooltip, drawn at the container's width. */
export function AreaChart({
  points,
  from,
  to,
  format,
  overlay,
  overlayLabel = 'Average',
  color = 'var(--accent)',
  height = 220,
  fromZero = false,
  label,
  marked,
}: AreaChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>()
  const gradient = useId()
  const [hover, setHover] = useState<number | null>(null)
  const days = Math.max(daysBetween(from, to), 1)

  const geometry = useMemo(() => {
    const values = [...points, ...(overlay ?? [])].map((p) => p.value)
    const lo = values.length ? Math.min(...values) : 0
    const hi = values.length ? Math.max(...values) : 1
    const ticks = niceTicks(
      fromZero ? Math.min(0, lo) : lo,
      Math.max(hi, fromZero ? 1 : hi),
      4,
    )
    const x = linear([0, days], [PAD.left, width - PAD.right])
    const y = linear([ticks[0], ticks.at(-1)!], [height - PAD.bottom, PAD.top])
    const toXY = (p: SeriesPoint) => ({
      x: x(daysBetween(from, p.date)),
      y: y(p.value),
    })
    const xy = points.map(toXY)
    const line = smoothPath(xy)
    const area = xy.length
      ? `${line} L${xy.at(-1)!.x},${height - PAD.bottom} L${xy[0].x},${height - PAD.bottom} Z`
      : ''
    const overlayLine = overlay ? smoothPath(overlay.map(toXY)) : ''
    // About five date labels along the bottom.
    const labelEvery = Math.max(1, Math.ceil(days / 5))
    const xLabels = Array.from(
      { length: Math.floor(days / labelEvery) + 1 },
      (_, i) => i * labelEvery,
    )
    return { ticks, x, y, xy, line, area, overlayLine, xLabels }
  }, [points, overlay, from, days, width, height, fromZero])

  function handlePointer(event: PointerEvent<SVGSVGElement>) {
    if (!points.length) return
    const rect = event.currentTarget.getBoundingClientRect()
    const px = event.clientX - rect.left
    let best = 0
    geometry.xy.forEach((p, i) => {
      if (Math.abs(p.x - px) < Math.abs(geometry.xy[best].x - px)) best = i
    })
    setHover(best)
  }

  const hovered = hover !== null ? points[hover] : null
  const hoveredXY = hover !== null ? geometry.xy[hover] : null
  const overlayAt = hovered && overlay?.find((p) => p.date === hovered.date)
  const markedX =
    marked && marked >= from && marked <= to
      ? geometry.x(daysBetween(from, marked))
      : null
  // Redraw the line when the range changes.
  const drawKey = `${from}:${to}:${points.length}`

  return (
    <div ref={ref} className="chart">
      <svg
        width={width}
        height={height}
        role="img"
        aria-label={label}
        onPointerMove={handlePointer}
        onPointerDown={handlePointer}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={color} stopOpacity="0.26" />
            <stop offset="1" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>
        {geometry.ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={geometry.y(t)}
              y2={geometry.y(t)}
              className="chart__grid"
            />
            <text
              x={PAD.left - 8}
              y={geometry.y(t)}
              className="chart__tick"
              textAnchor="end"
              dominantBaseline="middle"
            >
              {format(t)}
            </text>
          </g>
        ))}
        {geometry.xLabels.map((d) => (
          <text
            key={d}
            x={geometry.x(d)}
            y={height - 6}
            className="chart__tick"
            textAnchor="middle"
          >
            {formatDayMonth(addDays(from, d))}
          </text>
        ))}
        {markedX !== null && (
          <line
            x1={markedX}
            x2={markedX}
            y1={PAD.top}
            y2={height - PAD.bottom}
            className="chart__marked"
          />
        )}
        <motion.path
          key={`a${drawKey}`}
          d={geometry.area}
          fill={`url(#${gradient})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.25 }}
        />
        {geometry.overlayLine && (
          <motion.path
            key={`o${drawKey}`}
            d={geometry.overlayLine}
            fill="none"
            stroke="var(--text-3)"
            strokeWidth={1.5}
            strokeDasharray="4 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          />
        )}
        <motion.path
          key={`l${drawKey}`}
          d={geometry.line}
          fill="none"
          stroke={color}
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
        {geometry.xy.length > 0 &&
          geometry.xy.length <= 40 &&
          geometry.xy.map((p, i) => (
            <motion.circle
              key={`${drawKey}-${i}`}
              cx={p.x}
              cy={p.y}
              r={2.75}
              fill="var(--surface)"
              stroke={color}
              strokeWidth={1.75}
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.4 + (i / geometry.xy.length) * 0.6 }}
            />
          ))}
        {hoveredXY && (
          <g className="chart__hover">
            <line
              x1={hoveredXY.x}
              x2={hoveredXY.x}
              y1={PAD.top}
              y2={height - PAD.bottom}
            />
            <circle
              cx={hoveredXY.x}
              cy={hoveredXY.y}
              r={5}
              fill={color}
              stroke="var(--surface)"
              strokeWidth={2}
            />
          </g>
        )}
      </svg>
      <AnimatePresence>
        {hovered && hoveredXY && (
          <motion.div
            className="chart__tooltip"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.12 }}
            style={{
              left: Math.min(Math.max(hoveredXY.x, 70), width - 70),
              top: Math.max(hoveredXY.y - 12, 0),
            }}
          >
            <strong className="num">{format(hovered.value)}</strong>
            {overlayAt && (
              <span className="num">
                {overlayLabel} {format(overlayAt.value)}
              </span>
            )}
            <span>{formatDayShort(hovered.date)}</span>
          </motion.div>
        )}
      </AnimatePresence>
      {points.length === 0 && (
        <p className="chart__empty">No data in this range yet</p>
      )}
    </div>
  )
}
