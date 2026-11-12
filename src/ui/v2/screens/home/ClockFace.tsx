import { AnimatePresence, motion } from 'motion/react'
import { useNow } from '../../lib/useNow.ts'

const pad = (n: number) => String(n).padStart(2, '0')

/** A large live clock; each digit flips as it changes. */
export function ClockFace() {
  const now = useNow(1000)
  const hh = pad(now.getHours())
  const mm = pad(now.getMinutes())
  const ss = pad(now.getSeconds())

  return (
    <time
      className="clock num"
      dateTime={now.toISOString()}
      aria-label={`${hh}:${mm}`}
    >
      <Digits value={hh} />
      <span className="clock__colon">:</span>
      <Digits value={mm} />
      <span className="clock__seconds">
        <Digits value={ss} />
      </span>
    </time>
  )
}

function Digits({ value }: { value: string }) {
  return (
    <span className="clock__digits" aria-hidden="true">
      {value.split('').map((digit, i) => (
        <span key={i} className="clock__digit">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={digit}
              initial={{ y: '-60%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '60%', opacity: 0 }}
              transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            >
              {digit}
            </motion.span>
          </AnimatePresence>
        </span>
      ))}
    </span>
  )
}
