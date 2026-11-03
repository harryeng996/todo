import { useEffect, useState } from 'react'
import { formatShortDate } from '../../lib/date.ts'

/** Current time, updated on each full second (not drifting a second behind). */
function useNow(): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>
    const schedule = () => {
      timer = setTimeout(
        () => {
          setNow(new Date())
          schedule()
        },
        1000 - (Date.now() % 1000),
      )
    }
    schedule()
    return () => clearTimeout(timer)
  }, [])

  return now
}

const pad = (n: number) => String(n).padStart(2, '0')

export function Clock() {
  const now = useNow()
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

  return (
    <div className="clock">
      <time className="clock__time" dateTime={time}>
        {/* Fixed-width slots: Patrick Hand digits differ in width. */}
        {[...time].map((char, i) => (
          <span
            key={i}
            className={char === ':' ? 'clock__colon' : 'clock__digit'}
          >
            {char}
          </span>
        ))}
      </time>
      <p className="clock__date">{formatShortDate(now)}</p>
    </div>
  )
}
