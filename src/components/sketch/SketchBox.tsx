import type { HTMLAttributes } from 'react'
import { sketchOptions, useRough } from './useRough.ts'

interface SketchBoxProps extends HTMLAttributes<HTMLDivElement> {
  seed?: number
}

/** A container with a Rough.js outline that follows its size. */
export function SketchBox({
  seed = 1,
  className,
  children,
  ...rest
}: SketchBoxProps) {
  const svgRef = useRough(
    (rc, width, height) =>
      rc.rectangle(2, 2, width - 4, height - 4, { ...sketchOptions, seed }),
    seed,
  )

  return (
    <div
      className={['sketch-box', className].filter(Boolean).join(' ')}
      {...rest}
    >
      <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
      {children}
    </div>
  )
}
