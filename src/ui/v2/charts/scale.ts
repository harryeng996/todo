/** Rounded axis bounds and up to `count` evenly spaced ticks. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.abs(min) * 0.05 || 1
    min -= pad
    max += pad
  }
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step =
    [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? 10 * mag
  const start = Math.floor(min / step) * step
  const end = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = start; v <= end + step / 2; v += step)
    ticks.push(Number(v.toFixed(10)))
  return ticks
}

export function linear(
  domain: readonly [number, number],
  range: readonly [number, number],
): (v: number) => number {
  const [d0, d1] = domain
  const [r0, r1] = range
  const span = d1 - d0 || 1
  return (v) => r0 + ((v - d0) / span) * (r1 - r0)
}

/** A smooth path through the points (monotone-ish Catmull-Rom → Bézier). */
export function smoothPath(
  points: readonly { x: number; y: number }[],
): string {
  if (points.length === 0) return ''
  if (points.length === 1) return `M${points[0].x},${points[0].y}`
  let d = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] ?? p2
    const t = 0.18
    let c1y = p1.y + (p2.y - p0.y) * t
    let c2y = p2.y - (p3.y - p1.y) * t
    // Keep control points between the two ends so the curve never overshoots.
    const lo = Math.min(p1.y, p2.y)
    const hi = Math.max(p1.y, p2.y)
    c1y = Math.min(Math.max(c1y, lo), hi)
    c2y = Math.min(Math.max(c2y, lo), hi)
    const c1x = p1.x + (p2.x - p0.x) * t
    const c2x = p2.x - (p3.x - p1.x) * t
    d += ` C${c1x},${c1y} ${c2x},${c2y} ${p2.x},${p2.y}`
  }
  return d
}
