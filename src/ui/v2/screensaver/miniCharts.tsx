import { useId, type ReactNode } from 'react'
import { levelFor } from '../../../hooks/gridLevels.ts'
import { addDays, dayOfWeek, type DateKey } from '../../../lib/date.ts'
import { linear, smoothPath } from '../charts/scale.ts'

// Tiny static charts for the screensaver widgets. They draw in currentColor
// (with opacity for depth) so they sit on any gradient, and scale with their
// box through the viewBox — no measuring.

const barOpacity = (v: number, highlighted: boolean) => {
  if (highlighted) return 1
  return v > 0 ? 0.42 : 0.16
}

export function MiniBars({
  values,
  highlight = values.length - 1,
  height = 34,
}: {
  values: readonly number[]
  highlight?: number
  height?: number
}) {
  const slot = 100 / values.length
  const max = Math.max(1, ...values)
  return (
    <svg viewBox={`0 0 100 ${height}`} className="mini" aria-hidden="true">
      {values.map((v, i) => {
        const h = v > 0 ? Math.max(2, (v / max) * height) : 2
        return (
          <rect
            key={i}
            x={i * slot + slot * 0.16}
            y={height - h}
            width={slot * 0.68}
            height={h}
            rx={Math.min(3, slot * 0.3)}
            fill="currentColor"
            opacity={barOpacity(v, i === highlight)}
          />
        )
      })}
    </svg>
  )
}

export function MiniLine({
  values,
  height = 30,
  fromZero = false,
}: {
  values: readonly number[]
  height?: number
  fromZero?: boolean
}) {
  const fade = useId()
  if (values.length < 2) return null
  const lo = fromZero ? Math.min(0, ...values) : Math.min(...values)
  const hi = Math.max(...values, lo + 0.5)
  const x = linear([0, values.length - 1], [3, 97])
  const y = linear([lo, hi], [height - 3, 3])
  const pts = values.map((v, i) => ({ x: x(i), y: y(v) }))
  const line = smoothPath(pts)
  const last = pts.at(-1)!
  return (
    <svg viewBox={`0 0 100 ${height}`} className="mini" aria-hidden="true">
      <defs>
        <linearGradient id={fade} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.32" />
          <stop offset="1" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d={`${line} L${last.x},${height} L${pts[0].x},${height} Z`}
        fill={`url(#${fade})`}
      />
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={last.x} cy={last.y} r="3.2" fill="currentColor" />
    </svg>
  )
}

const DOT_OPACITY = [0.14, 0.34, 0.55, 0.78, 1]

/** The last `weeks` weeks as dots, brighter for busier days. */
export function MiniDots({
  byDay,
  today,
  weeks = 10,
}: {
  byDay: Map<DateKey, number>
  today: DateKey
  weeks?: number
}) {
  const step = 10
  const lastSunday = addDays(today, -dayOfWeek(today))
  const first = addDays(lastSunday, -7 * (weeks - 1))
  let max = 0
  for (let i = 0; i < weeks * 7; i++)
    max = Math.max(max, byDay.get(addDays(first, i)) ?? 0)
  return (
    <svg
      viewBox={`0 0 ${weeks * step} ${7 * step}`}
      className="mini"
      aria-hidden="true"
    >
      {Array.from({ length: weeks * 7 }, (_, i) => {
        const date = addDays(first, i)
        if (date > today) return null
        return (
          <circle
            key={date}
            cx={Math.floor(i / 7) * step + step / 2}
            cy={(i % 7) * step + step / 2}
            r={step * 0.36}
            fill="currentColor"
            opacity={DOT_OPACITY[levelFor(byDay.get(date) ?? 0, max)]}
          />
        )
      })}
    </svg>
  )
}

export function MiniRing({
  value,
  children,
}: {
  value: number
  children?: ReactNode
}) {
  const r = 40
  const c = 2 * Math.PI * r
  return (
    <div className="mini-ring">
      <svg viewBox="0 0 100 100" className="mini" aria-hidden="true">
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeOpacity="0.2"
          strokeWidth="11"
        />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - Math.min(Math.max(value, 0), 1))}
          transform="rotate(-90 50 50)"
        />
      </svg>
      {children && <span className="mini-ring__center">{children}</span>}
    </div>
  )
}
