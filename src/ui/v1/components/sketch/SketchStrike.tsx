import type { ReactNode } from 'react'
import { sketchOptions, useRough } from './useRough.ts'

interface SketchStrikeProps {
  active: boolean
  children: ReactNode
  className?: string
  seed?: number
}

/** Hand-drawn strike-through line across its content when `active`. */
export function SketchStrike({
  active,
  children,
  className,
  seed = 1,
}: SketchStrikeProps) {
  const svgRef = useRough(
    (rc, width, height) =>
      active
        ? rc.line(-2, height * 0.55, width + 2, height * 0.5, {
            ...sketchOptions,
            seed,
          })
        : [],
    active,
  )

  return (
    <span className={['sketch-strike', className].filter(Boolean).join(' ')}>
      {children}
      <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
    </span>
  )
}
