import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { motion } from 'motion/react'
import type { ReactNode } from 'react'
import { riseIn } from '../lib/motion.ts'

interface StatTileProps {
  label: ReactNode
  value: ReactNode
  unit?: ReactNode
  icon?: ReactNode
  /** Accent for the icon chip, e.g. var(--focus). */
  tone?: string
  footer?: ReactNode
  /** Drawn on the right (a ring or sparkline). */
  aside?: ReactNode
  onClick?: () => void
  className?: string
}

export function StatTile({
  label,
  value,
  unit,
  icon,
  tone = 'var(--accent)',
  footer,
  aside,
  onClick,
  className = '',
}: StatTileProps) {
  const body = (
    <>
      <div className="stat__main">
        <div className="stat__label">
          {icon && (
            <span className="stat__icon" style={{ color: tone }}>
              {icon}
            </span>
          )}
          {label}
        </div>
        <div className="stat__value">
          {value}
          {unit && <span className="stat__unit">{unit}</span>}
        </div>
        {footer && <div className="stat__footer">{footer}</div>}
      </div>
      {aside && <div className="stat__aside">{aside}</div>}
    </>
  )
  return onClick ? (
    <motion.button
      type="button"
      className={`stat stat--button ${className}`}
      variants={riseIn}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      {body}
    </motion.button>
  ) : (
    <motion.div className={`stat ${className}`} variants={riseIn}>
      {body}
    </motion.div>
  )
}

interface DeltaProps {
  /** Signed change; null shows a dash. */
  change: number | null
  format?: (abs: number) => string
  /** Which direction is good: colors follow it. 'none' keeps it neutral. */
  good?: 'up' | 'down' | 'none'
  suffix?: ReactNode
}

export function Delta({
  change,
  format = (v) => String(v),
  good = 'up',
  suffix,
}: DeltaProps) {
  if (change === null || !Number.isFinite(change))
    return (
      <span className="delta delta--flat">—{suffix && <> {suffix}</>}</span>
    )
  const rounded = Number(format(Math.abs(change)).replace(/[^\d.]/g, ''))
  const flat = rounded === 0
  const up = change > 0
  let tone = 'flat'
  if (!flat && good !== 'none') tone = up === (good === 'up') ? 'good' : 'bad'
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight
  return (
    <span className={`delta delta--${tone}`}>
      <Icon size={14} strokeWidth={2.25} aria-hidden="true" />
      <span className="num">
        <span className="visually-hidden">
          {flat ? 'no change' : up ? 'up' : 'down'}{' '}
        </span>
        {format(Math.abs(change))}
      </span>
      {suffix && <span className="delta__suffix">{suffix}</span>}
    </span>
  )
}
