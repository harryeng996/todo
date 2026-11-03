import type { HTMLAttributes } from 'react'
import { sketchOptions, useRough } from './useRough.ts'

interface SketchBoxProps extends HTMLAttributes<HTMLDivElement> {
  seed?: number
  /**
   * Draw a solid fill with the outline (colour it via `.sketch-box__fill` in CSS).
   * A CSS background can't follow the hand-drawn edges, so white gaps would show
   * wherever the outline bows outward.
   */
  filled?: boolean
}

/** A container with a Rough.js outline that follows its size. */
export function SketchBox({
  seed = 1,
  filled = false,
  className,
  children,
  ...rest
}: SketchBoxProps) {
  const svgRef = useRough((rc, width, height) => {
    if (!filled) {
      return rc.rectangle(2, 2, width - 4, height - 4, {
        ...sketchOptions,
        seed,
      })
    }
    const box = rc.rectangle(2, 2, width - 4, height - 4, {
      ...sketchOptions,
      // Rough bows edges in proportion to their length; keep long edges close to the fill.
      bowing: Math.min(1, 200 / Math.max(width, height)),
      fill: 'currentColor',
      fillStyle: 'solid',
      seed,
    })
    box.firstElementChild?.setAttribute('class', 'sketch-box__fill')
    return box
  }, seed)

  const classes = ['sketch-box', filled && 'sketch-box--filled', className]
  return (
    <div className={classes.filter(Boolean).join(' ')} {...rest}>
      <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
      {children}
    </div>
  )
}
