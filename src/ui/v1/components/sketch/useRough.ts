import { useEffect, useLayoutEffect, useRef } from 'react'
import rough from 'roughjs'
import type { Options } from 'roughjs/bin/core'
import type { RoughSVG } from 'roughjs/bin/svg'

export type RoughDraw = (
  rc: RoughSVG,
  width: number,
  height: number,
) => SVGGElement | SVGGElement[]

// Shared stroke style so Rough.js lines match the CSS sketch borders.
// `currentColor` lets CSS pick the colour via `color` on the <svg>.
export const sketchOptions = {
  stroke: 'currentColor',
  strokeWidth: 1.75,
  roughness: 1.2,
  bowing: 1,
} satisfies Options

/**
 * Draws into an <svg> with Rough.js. Redraws only when the svg is resized or
 * `redrawKey` changes, never on plain re-renders. Pass a fixed `seed` in the
 * draw options so the strokes look the same on every redraw.
 */
export function useRough(draw: RoughDraw, redrawKey: unknown = null) {
  const svgRef = useRef<SVGSVGElement>(null)
  const drawRef = useRef(draw)

  useLayoutEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const svg = svgRef.current
    if (!svg) return
    const rc = rough.svg(svg)
    // ResizeObserver also fires once right after observe(), which does the first draw.
    const observer = new ResizeObserver(([entry]) => {
      // contentRect is the layout size, unaffected by CSS transforms. (The bounding
      // rect of a rotated element is taller, which drew outlines past the box.)
      const { width, height } = entry.contentRect
      if (width === 0 || height === 0) return
      svg.replaceChildren(...[drawRef.current(rc, width, height)].flat())
    })
    observer.observe(svg)
    return () => observer.disconnect()
  }, [redrawKey])

  return svgRef
}

/** Stable, non-zero Rough.js seed derived from a string such as a todo id. */
export function seedFrom(value: string): number {
  let hash = 0
  for (const char of value) {
    hash = (Math.imul(hash, 31) + char.codePointAt(0)!) | 0
  }
  return (Math.abs(hash) % 2_147_483_646) + 1
}
