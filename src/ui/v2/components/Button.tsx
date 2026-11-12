import { motion, type HTMLMotionProps } from 'motion/react'
import type { ReactNode } from 'react'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'soft'

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  children?: ReactNode
}

export function Button({
  variant = 'secondary',
  size = 'md',
  icon,
  children,
  className = '',
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.97 }}
      className={`btn btn--${variant} btn--${size} ${children ? '' : 'btn--icon'} ${className}`}
      {...rest}
    >
      {icon}
      {children}
    </motion.button>
  )
}

interface IconButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  label: string
  variant?: Variant
  size?: 'sm' | 'md' | 'lg'
  children: ReactNode
}

/** An icon-only button; `label` is its accessible name and tooltip. */
export function IconButton({
  label,
  variant = 'ghost',
  size = 'md',
  children,
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  return (
    <motion.button
      type={type}
      whileTap={{ scale: 0.92 }}
      aria-label={label}
      title={label}
      className={`btn btn--${variant} btn--${size} btn--icon ${className}`}
      {...rest}
    >
      {children}
    </motion.button>
  )
}
