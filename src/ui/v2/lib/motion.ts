import type { Variants } from 'motion/react'

/** Children of <ScreenBody> fade up one after another. */
export const riseIn: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] },
  },
}

export const stagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05, delayChildren: 0.04 } },
}

export const EASE_OUT = [0.22, 1, 0.36, 1] as const
