/** '+1.2', '−0.4', '±0.0' (one decimal). */
export function formatDelta(change: number, digits = 1): string {
  const rounded = Number(change.toFixed(digits))
  const sign = rounded > 0 ? '+' : rounded < 0 ? '−' : '±'
  return `${sign}${Math.abs(rounded).toFixed(digits)}`
}
