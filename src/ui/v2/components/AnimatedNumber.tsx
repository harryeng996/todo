import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { useEffect } from 'react'
import { useAppSettings } from '../state/appContext.ts'

interface AnimatedNumberProps {
  value: number
  format?: (value: number) => string
  className?: string
}

const defaultFormat = (v: number) => String(Math.round(v))

/** Counts up from 0 on mount and glides to new values. */
export function AnimatedNumber({
  value,
  format = defaultFormat,
  className = '',
}: AnimatedNumberProps) {
  const { reducedMotion } = useAppSettings()
  const motionValue = useMotionValue(reducedMotion ? value : 0)
  const text = useTransform(motionValue, (v) => format(v))

  useEffect(() => {
    if (reducedMotion) {
      motionValue.set(value)
      return
    }
    const controls = animate(motionValue, value, {
      duration: 0.9,
      ease: [0.22, 1, 0.36, 1],
    })
    return () => controls.stop()
  }, [value, reducedMotion, motionValue])

  return <motion.span className={`num ${className}`}>{text}</motion.span>
}
