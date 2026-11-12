import { AnimatePresence, motion } from 'motion/react'

/** Text whose characters roll as they change (digits of a clock or timer). */
export function FlipText({
  value,
  className = '',
}: {
  value: string
  className?: string
}) {
  return (
    <span className={`flip ${className}`} aria-hidden="true">
      {value.split('').map((char, i) =>
        /\d/.test(char) ? (
          <span key={i} className="flip__char">
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.span
                key={char}
                initial={{ y: '-60%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '60%', opacity: 0 }}
                transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
              >
                {char}
              </motion.span>
            </AnimatePresence>
          </span>
        ) : (
          <span key={i} className="flip__sep">
            {char}
          </span>
        ),
      )}
    </span>
  )
}
