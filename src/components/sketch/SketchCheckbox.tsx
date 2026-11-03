import { sketchOptions, useRough } from './useRough.ts'

interface SketchCheckboxProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** Accessible name for the checkbox. */
  label: string
  seed?: number
}

/** A native checkbox (visually hidden) with a Rough.js box and tick on top. */
export function SketchCheckbox({
  checked,
  onChange,
  label,
  seed = 1,
}: SketchCheckboxProps) {
  const svgRef = useRough((rc, width, height) => {
    const box = rc.rectangle(1.5, 1.5, width - 3, height - 3, {
      ...sketchOptions,
      seed,
    })
    if (!checked) return box
    const tick = rc.linearPath(
      [
        [width * 0.2, height * 0.5],
        [width * 0.42, height * 0.78],
        [width * 0.9, height * 0.05],
      ],
      { ...sketchOptions, strokeWidth: 2.5, seed },
    )
    tick.setAttribute('class', 'sketch-checkbox__tick')
    return [box, tick]
  }, checked)

  return (
    <label className="sketch-checkbox">
      <input
        type="checkbox"
        className="visually-hidden"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        aria-label={label}
      />
      <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
    </label>
  )
}
