import { FlipText } from '../../components/FlipText.tsx'
import { useNow } from '../../lib/useNow.ts'

const pad = (n: number) => String(n).padStart(2, '0')

/** A large live clock; each digit rolls as it changes. */
export function ClockFace() {
  const now = useNow(1000)
  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())

  return (
    <time
      className="clock num"
      dateTime={now.toISOString()}
      aria-label={`${hh}:${mm}`}
    >
      <FlipText value={hh} />
      <span className="clock__colon" aria-hidden="true">
        :
      </span>
      <FlipText value={mm} />
      <FlipText value={pad(now.getSeconds())} className="clock__seconds" />
    </time>
  )
}
