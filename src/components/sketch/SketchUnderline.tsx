import type { ReactNode } from 'react'
import { sketchOptions, useRough } from './useRough.ts'

interface SketchUnderlineProps {
  children: ReactNode
  seed?: number
}

/** Hand-drawn accent underline under inline content, e.g. a heading. */
export function SketchUnderline({ children, seed = 1 }: SketchUnderlineProps) {
  const svgRef = useRough(
    (rc, width, height) =>
      rc.line(2, height * 0.4, width - 2, height * 0.6, {
        ...sketchOptions,
        strokeWidth: 3,
        roughness: 1.5,
        bowing: 2,
        seed,
      }),
    seed,
  )

  return (
    <span className="sketch-underline">
      {children}
      <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
    </span>
  )
}
