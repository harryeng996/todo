import type { InputHTMLAttributes } from 'react'

export function SketchInput({
  className,
  ...rest
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={['sketch-input', 'sketch-border--alt', className]
        .filter(Boolean)
        .join(' ')}
      {...rest}
    />
  )
}
