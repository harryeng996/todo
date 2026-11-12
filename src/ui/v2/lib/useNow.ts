import { useEffect, useState } from 'react'

/** The current time, refreshed every `ms` (aligned to the clock), or frozen when `active` is false. */
export function useNow(ms = 1000, active = true): Date {
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    if (!active) return
    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      const date = new Date()
      setNow(date)
      timer = setTimeout(tick, ms - (date.getTime() % ms) + 5)
    }
    tick()
    return () => clearTimeout(timer)
  }, [ms, active])

  return now
}
