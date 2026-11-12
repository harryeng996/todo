import { motion } from 'motion/react'
import type { ReactNode } from 'react'

interface SwitchProps {
  checked: boolean
  onChange: (checked: boolean) => void
  label: ReactNode
  hint?: ReactNode
  id: string
  disabled?: boolean
}

/** A settings row: label and hint on the left, a toggle on the right. */
export function Switch({
  checked,
  onChange,
  label,
  hint,
  id,
  disabled,
}: SwitchProps) {
  return (
    <div className="switch-row">
      <label htmlFor={id} className="switch-row__text">
        <span className="switch-row__label">{label}</span>
        {hint && <span className="switch-row__hint">{hint}</span>}
      </label>
      <button
        id={id}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className="switch"
        data-on={checked}
        onClick={() => onChange(!checked)}
      >
        <motion.span
          className="switch__thumb"
          layout
          transition={{ type: 'spring', stiffness: 600, damping: 34 }}
        />
      </button>
    </div>
  )
}
