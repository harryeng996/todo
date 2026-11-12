import type { ButtonHTMLAttributes } from 'react'

interface SketchButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'primary' | 'ghost'
}

export function SketchButton({
  variant = 'default',
  type = 'button',
  className,
  ...rest
}: SketchButtonProps) {
  const classes = [
    'sketch-button',
    variant !== 'ghost' && 'sketch-border',
    variant !== 'default' && `sketch-button--${variant}`,
    className,
  ]
  return (
    <button
      type={type}
      className={classes.filter(Boolean).join(' ')}
      {...rest}
    />
  )
}
