import { sketchOptions, useRough } from './useRough.ts'

interface SketchProgressProps {
  /** 0..1 */
  value: number
  /** Accessible name. */
  label: string
  /** Makes the line a slider; called with the new 0..1 value. */
  onSeek?: (value: number) => void
  /** Spoken value, e.g. '1:12 of 3:40'. Defaults to a percentage. */
  valueText?: string
  disabled?: boolean
  seed?: number
  className?: string
}

const SEEK_STEPS = 1000

/** A hand-drawn progress line: pencil track with an accent stroke over the done part. */
export function SketchProgress({
  value,
  label,
  onSeek,
  valueText,
  disabled = false,
  seed = 1,
  className,
}: SketchProgressProps) {
  const clamped = Math.min(Math.max(value, 0), 1)
  const percent = Math.round(clamped * 100)

  const svgRef = useRough(
    (rc, width, height) => {
      const y = height / 2
      const track = rc.line(2, y, width - 2, y, {
        ...sketchOptions,
        strokeWidth: 1.5,
        seed,
      })
      track.setAttribute('class', 'sketch-progress__track')
      if (clamped === 0) return track
      const fill = rc.line(2, y, 2 + (width - 4) * clamped, y, {
        ...sketchOptions,
        strokeWidth: 4,
        roughness: 1,
        seed: seed + 1,
      })
      fill.setAttribute('class', 'sketch-progress__fill')
      return [track, fill]
    },
    Math.round(clamped * SEEK_STEPS),
  )

  const classes = ['sketch-progress', className].filter(Boolean).join(' ')

  if (!onSeek) {
    return (
      <div
        className={classes}
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={percent}
        aria-valuetext={valueText}
      >
        <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
      </div>
    )
  }

  return (
    <div className={`${classes} sketch-progress--seek`}>
      <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
      <input
        type="range"
        className="sketch-progress__input"
        min={0}
        max={SEEK_STEPS}
        value={Math.round(clamped * SEEK_STEPS)}
        onChange={(event) => onSeek(Number(event.target.value) / SEEK_STEPS)}
        aria-label={label}
        aria-valuetext={valueText ?? `${percent}%`}
        disabled={disabled}
      />
    </div>
  )
}
