import type { ReactNode } from 'react'
import { sketchOptions, useRough } from './useRough.ts'

interface SketchRingProps {
  /** 0..1, drawn clockwise from 12 o'clock. */
  value: number
  /** Accessible name. */
  label: string
  /** Spoken value, e.g. '24:13 left'. Defaults to a percentage. */
  valueText?: string
  seed?: number
  className?: string
  /** Shown in the middle of the ring. */
  children?: ReactNode
}

const TICKS = 12

/** A hand-drawn clock face: pencil ring and ticks, with an accent arc for progress. */
export function SketchRing({
  value,
  label,
  valueText,
  seed = 1,
  className,
  children,
}: SketchRingProps) {
  const clamped = Math.min(Math.max(value, 0), 1)
  const percent = Math.round(clamped * 100)

  const svgRef = useRough(
    (rc, width, height) => {
      const cx = width / 2
      const cy = height / 2
      const r = Math.min(width, height) / 2 - 8 // room for the stroke wobble
      const at = (angle: number, radius: number): [number, number] => [
        cx + Math.cos(angle) * radius,
        cy + Math.sin(angle) * radius,
      ]

      const track = rc.circle(cx, cy, r * 2, {
        ...sketchOptions,
        strokeWidth: 2,
        seed,
      })
      track.setAttribute('class', 'sketch-ring__track')
      const ticks = Array.from({ length: TICKS }, (_, i) => {
        const angle = (i / TICKS) * 2 * Math.PI - Math.PI / 2
        const quarter = i % 3 === 0
        const tick = rc.line(
          ...at(angle, r - (quarter ? 13 : 8)),
          ...at(angle, r - 4),
          {
            ...sketchOptions,
            strokeWidth: quarter ? 2 : 1.25,
            roughness: 0.6,
            seed: seed + 2 + i,
          },
        )
        tick.setAttribute('class', 'sketch-ring__tick')
        return tick
      })
      if (clamped <= 0) return [track, ...ticks]

      const start = -Math.PI / 2
      const stop = start + 2 * Math.PI * Math.min(clamped, 0.9999)
      const arc = rc.arc(cx, cy, r * 2, r * 2, start, stop, false, {
        ...sketchOptions,
        strokeWidth: 5,
        roughness: 0.9,
        seed: seed + 20,
      })
      arc.setAttribute('class', 'sketch-ring__arc')
      const tip = rc.circle(...at(stop, r), 10, {
        ...sketchOptions,
        strokeWidth: 1,
        fill: 'currentColor',
        fillStyle: 'solid',
        seed: seed + 21,
      })
      tip.setAttribute('class', 'sketch-ring__tip')
      return [track, ...ticks, arc, tip]
    },
    // Redraw per degree, not on every tick of the countdown.
    Math.round(clamped * 360),
  )

  return (
    <div
      className={['sketch-ring', className].filter(Boolean).join(' ')}
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={percent}
      aria-valuetext={valueText}
    >
      <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
      <div className="sketch-ring__center">{children}</div>
    </div>
  )
}
