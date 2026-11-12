import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface ProgressRingProps {
  /** 0..1 */
  value: number
  size?: number
  stroke?: number
  color?: string
  track?: string
  children?: ReactNode
  label?: string
  /** Seconds for the fill to move; 0 for a ticking timer. */
  duration?: number
  className?: string
}

export function ProgressRing({
  value,
  size = 64,
  stroke = 6,
  color = 'var(--accent)',
  track = 'var(--surface-3)',
  children,
  label,
  duration = 0.9,
  className = '',
}: ProgressRingProps) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(Math.max(value, 0), 1)

  return (
    <div
      className={`ring ${className}`}
      style={{ width: size, height: size }}
      role={label ? 'img' : undefined}
      aria-label={label}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={track}
          strokeWidth={stroke}
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c * (1 - clamped) }}
          transition={
            duration
              ? { duration, ease: [0.22, 1, 0.36, 1] }
              : { duration: 0.25, ease: 'linear' }
          }
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      {children && <div className="ring__center">{children}</div>}
    </div>
  )
}
