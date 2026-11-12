import { useMemo } from 'react'
import rough from 'roughjs'
import type { Drawable, Options } from 'roughjs/bin/core'
import { levelFor } from '../../../hooks/gridLevels.ts'
import { addDays, dayOfWeek, type DateKey } from '../../../lib/date.ts'
import { linear, smoothPath } from '../charts/scale.ts'

// Small, static charts for the posters. Each draws into a fixed viewBox and
// scales with the poster (width: 100% in CSS), so no measuring is needed.

interface MiniBarsProps {
  values: readonly number[]
  color?: string
  /** Index drawn in `accent` (e.g. today). */
  highlight?: number
  accent?: string
  labels?: readonly string[]
  labelColor?: string
  font?: string
  /** viewBox height of the bars area. */
  height?: number
  radius?: number
}

export function MiniBars({
  values,
  color = 'currentColor',
  highlight = -1,
  accent = color,
  labels,
  labelColor = 'currentColor',
  font,
  height = 40,
  radius = 1.5,
}: MiniBarsProps) {
  const n = values.length
  const W = 100
  const slot = W / n
  const max = Math.max(1, ...values)
  const labelH = labels ? 9 : 0
  return (
    <svg
      viewBox={`0 0 ${W} ${height + labelH}`}
      className="mini"
      aria-hidden="true"
    >
      {values.map((v, i) => {
        const h = v > 0 ? Math.max(1.5, (v / max) * height) : 0.8
        return (
          <rect
            key={i}
            x={i * slot + slot * 0.18}
            y={height - h}
            width={slot * 0.64}
            height={h}
            rx={radius}
            fill={i === highlight ? accent : color}
            opacity={v > 0 ? 1 : 0.25}
          />
        )
      })}
      {labels?.map((l, i) => (
        <text
          key={i}
          x={i * slot + slot / 2}
          y={height + 7.5}
          textAnchor="middle"
          fontSize="5.5"
          fill={labelColor}
          fontFamily={font}
        >
          {l}
        </text>
      ))}
    </svg>
  )
}

interface MiniLineProps {
  values: readonly number[]
  color?: string
  fill?: boolean
  width?: number
  height?: number
  strokeWidth?: number
  /** Start the scale at zero (counts) rather than near the minimum (weight). */
  fromZero?: boolean
  dot?: boolean
}

export function MiniLine({
  values,
  color = 'currentColor',
  fill = false,
  width = 100,
  height = 28,
  strokeWidth = 1.4,
  fromZero = true,
  dot = true,
}: MiniLineProps) {
  if (values.length < 2) return null
  const lo = fromZero ? Math.min(0, ...values) : Math.min(...values)
  const hi = Math.max(...values, lo + 1)
  const x = linear([0, values.length - 1], [2, width - 2])
  const y = linear([lo, hi], [height - 2, 3])
  const pts = values.map((v, i) => ({ x: x(i), y: y(v) }))
  const line = smoothPath(pts)
  const last = pts.at(-1)!
  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="mini" aria-hidden="true">
      {fill && (
        <path
          d={`${line} L${last.x},${height} L${pts[0].x},${height} Z`}
          fill={color}
          opacity="0.14"
        />
      )}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {dot && (
        <circle cx={last.x} cy={last.y} r={strokeWidth * 1.4} fill={color} />
      )}
    </svg>
  )
}

interface MiniHeatmapProps {
  byDay: Map<DateKey, number>
  today: DateKey
  weeks?: number
  /** Five colours, empty to full. */
  levels: readonly string[]
}

export function MiniHeatmap({
  byDay,
  today,
  weeks = 16,
  levels,
}: MiniHeatmapProps) {
  const cell = 10
  const gap = 2.4
  const lastSunday = addDays(today, -dayOfWeek(today))
  const first = addDays(lastSunday, -7 * (weeks - 1))
  let max = 0
  for (let i = 0; i < weeks * 7; i++)
    max = Math.max(max, byDay.get(addDays(first, i)) ?? 0)
  const step = cell + gap
  return (
    <svg
      viewBox={`0 0 ${weeks * step - gap} ${7 * step - gap}`}
      className="mini"
      aria-hidden="true"
    >
      {Array.from({ length: weeks * 7 }, (_, i) => {
        const date = addDays(first, i)
        if (date > today) return null
        const level = levelFor(byDay.get(date) ?? 0, max)
        return (
          <rect
            key={date}
            x={Math.floor(i / 7) * step}
            y={(i % 7) * step}
            width={cell}
            height={cell}
            rx={2}
            fill={levels[level]}
          />
        )
      })}
    </svg>
  )
}

export function MiniRing({
  value,
  color = 'currentColor',
  track = 'rgb(0 0 0 / 0.12)',
  children,
}: {
  value: number
  color?: string
  track?: string
  children?: React.ReactNode
}) {
  const r = 42
  const c = 2 * Math.PI * r
  return (
    <svg viewBox="0 0 100 100" className="mini" aria-hidden="true">
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={track}
        strokeWidth="9"
      />
      <circle
        cx="50"
        cy="50"
        r={r}
        fill="none"
        stroke={color}
        strokeWidth="9"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c * (1 - Math.min(Math.max(value, 0), 1))}
        transform="rotate(-90 50 50)"
      />
      {children}
    </svg>
  )
}

/* ---------- Hand-drawn (Rough.js) ---------- */

const gen = rough.generator()

function RoughPaths({ drawables }: { drawables: Drawable[] }) {
  return (
    <>
      {drawables.flatMap((d, i) =>
        gen
          .toPaths(d)
          .map((p, j) => (
            <path
              key={`${i}-${j}`}
              d={p.d}
              stroke={p.stroke === 'none' ? undefined : p.stroke}
              strokeWidth={p.strokeWidth}
              fill={p.fill ?? 'none'}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )),
      )}
    </>
  )
}

const ink = (o: Options): Options => ({
  roughness: 1.4,
  bowing: 1.2,
  strokeWidth: 1.6,
  ...o,
})

/** Hand-drawn bars with day letters, like a doodle on paper. */
export function RoughBars({
  values,
  labels,
  ink: inkColor,
  fill,
  font,
}: {
  values: readonly number[]
  labels: readonly string[]
  ink: string
  fill: string
  font: string
}) {
  const drawables = useMemo(() => {
    const W = 140
    const H = 70
    const slot = W / values.length
    const max = Math.max(1, ...values)
    const out = [gen.line(2, H, W - 2, H, ink({ stroke: inkColor, seed: 7 }))]
    values.forEach((v, i) => {
      const h = v > 0 ? Math.max(4, (v / max) * (H - 6)) : 0
      if (!h) return
      out.push(
        gen.rectangle(
          i * slot + slot * 0.2,
          H - h,
          slot * 0.6,
          h,
          ink({
            stroke: inkColor,
            fill,
            fillStyle: 'hachure',
            hachureGap: 3.2,
            fillWeight: 1.2,
            seed: 11 + i,
          }),
        ),
      )
    })
    return out
  }, [values, inkColor, fill])
  const slot = 140 / values.length
  return (
    <svg viewBox="0 0 140 82" className="mini" aria-hidden="true">
      <RoughPaths drawables={drawables} />
      {labels.map((l, i) => (
        <text
          key={i}
          x={i * slot + slot / 2}
          y={80}
          textAnchor="middle"
          fontSize="9"
          fill={inkColor}
          fontFamily={font}
        >
          {l}
        </text>
      ))}
    </svg>
  )
}

/** A doodled coffee mug with a striped band and steam. */
export function RoughMug({
  ink: inkColor,
  accent,
}: {
  ink: string
  accent: string
}) {
  const drawables = useMemo(
    () => [
      gen.path(
        'M18 40 L22 108 Q24 116 32 116 L74 116 Q82 116 84 108 L88 40 Z',
        ink({
          stroke: inkColor,
          fill: inkColor,
          fillStyle: 'solid',
          seed: 3,
        }),
      ),
      gen.ellipse(
        53,
        40,
        70,
        12,
        ink({ stroke: inkColor, fill: '#f6efe2', fillStyle: 'solid', seed: 4 }),
      ),
      gen.path(
        'M86 58 Q110 58 108 78 Q106 96 82 94',
        ink({ stroke: inkColor, strokeWidth: 5, seed: 5 }),
      ),
      gen.line(
        24,
        74,
        83,
        74,
        ink({ stroke: accent, strokeWidth: 3, seed: 6 }),
      ),
      gen.line(
        25,
        84,
        82,
        84,
        ink({ stroke: accent, strokeWidth: 3, seed: 8 }),
      ),
      gen.path(
        'M40 28 Q34 18 42 10 Q48 2 42 -6',
        ink({ stroke: inkColor, seed: 9 }),
      ),
      gen.path(
        'M58 28 Q52 16 60 8 Q66 0 60 -10',
        ink({ stroke: inkColor, seed: 10 }),
      ),
    ],
    [inkColor, accent],
  )
  return (
    <svg viewBox="0 -14 120 136" className="mini" aria-hidden="true">
      <RoughPaths drawables={drawables} />
    </svg>
  )
}

/** Loose hand-drawn stripes across the bottom of the sketch poster. */
export function RoughStripes({ color }: { color: string }) {
  const drawables = useMemo(
    () =>
      Array.from({ length: 9 }, (_, i) =>
        gen.line(
          -4 + (i % 2) * 6,
          6 + i * 7,
          204 - (i % 3) * 8,
          4 + i * 7.4,
          ink({
            stroke: color,
            strokeWidth: 2.2,
            roughness: 2,
            seed: 20 + i,
          }),
        ),
      ),
    [color],
  )
  return (
    <svg
      viewBox="0 0 200 72"
      className="mini"
      preserveAspectRatio="none"
      aria-hidden="true"
    >
      <RoughPaths drawables={drawables} />
    </svg>
  )
}
