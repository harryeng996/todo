import { useEffect, useState } from 'react'
import { msUntilNextDay, toDateKey, type DateKey } from '../lib/date.ts'

/**
 * Today's date key. Changes once, at local midnight, so components using it
 * don't re-render every second like the clock does.
 */
export function useToday(): DateKey {
  const [today, setToday] = useState(() => toDateKey(new Date()))

  useEffect(() => {
    const check = () => setToday(toDateKey(new Date()))
    const timer = setTimeout(check, msUntilNextDay(new Date()) + 50)
    // Timers can fire late after the laptop sleeps, so also re-check on return.
    window.addEventListener('focus', check)
    document.addEventListener('visibilitychange', check)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', check)
      document.removeEventListener('visibilitychange', check)
    }
  }, [today])

  return today
}
