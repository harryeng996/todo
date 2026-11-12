import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'
import { riseIn, stagger } from '../lib/motion.ts'

interface ScreenBodyProps extends HTMLMotionProps<'div'> {
  children: ReactNode
}

export function ScreenBody({
  children,
  className = '',
  ...rest
}: ScreenBodyProps) {
  return (
    <motion.div
      className={`screen ${className}`}
      variants={stagger}
      initial="hidden"
      animate="show"
      {...rest}
    >
      {children}
    </motion.div>
  )
}

interface ScreenHeaderProps {
  eyebrow?: ReactNode
  title: ReactNode
  subtitle?: ReactNode
  actions?: ReactNode
}

export function ScreenHeader({
  eyebrow,
  title,
  subtitle,
  actions,
}: ScreenHeaderProps) {
  return (
    <motion.header className="screen-header" variants={riseIn}>
      <div className="screen-header__text">
        {eyebrow && <p className="screen-header__eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {subtitle && <p className="screen-header__subtitle">{subtitle}</p>}
      </div>
      {actions && <div className="screen-header__actions">{actions}</div>}
    </motion.header>
  )
}

interface CardProps extends Omit<HTMLMotionProps<'section'>, 'title'> {
  title?: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  /** Accent icon shown before the title. */
  icon?: ReactNode
  children?: ReactNode
  padded?: boolean
}

export function Card({
  title,
  subtitle,
  action,
  icon,
  children,
  className = '',
  padded = true,
  ...rest
}: CardProps) {
  return (
    <motion.section
      className={`card ${padded ? '' : 'card--flush'} ${className}`}
      variants={riseIn}
      {...rest}
    >
      {(title || action) && (
        <header className="card__header">
          <div className="card__title">
            {icon && <span className="card__icon">{icon}</span>}
            <div>
              {title && <h2>{title}</h2>}
              {subtitle && <p className="card__subtitle">{subtitle}</p>}
            </div>
          </div>
          {action && <div className="card__action">{action}</div>}
        </header>
      )}
      {children}
    </motion.section>
  )
}
