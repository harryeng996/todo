import { motion } from 'motion/react'
import { useId, type KeyboardEvent, type ReactNode } from 'react'

interface SegmentedProps<T extends string> {
  options: readonly { value: T; label: ReactNode; title?: string }[]
  value: T
  onChange: (value: T) => void
  label: string
  size?: 'sm' | 'md'
  className?: string
}

/** A radio group drawn as pills; the selection slides between options. */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  size = 'md',
  className = '',
}: SegmentedProps<T>) {
  const id = useId()

  function handleKey(event: KeyboardEvent<HTMLDivElement>) {
    const index = options.findIndex((o) => o.value === value)
    let next = -1
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown')
      next = (index + 1) % options.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp')
      next = (index - 1 + options.length) % options.length
    if (next === -1) return
    event.preventDefault()
    onChange(options[next].value)
    const buttons = event.currentTarget.querySelectorAll('button')
    buttons[next]?.focus()
  }

  return (
    <div
      className={`segmented segmented--${size} ${className}`}
      role="radiogroup"
      aria-label={label}
      onKeyDown={handleKey}
    >
      {options.map((option) => {
        const selected = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            title={option.title}
            className="segmented__option"
            onClick={() => onChange(option.value)}
          >
            {selected && (
              <motion.span
                layoutId={`seg-${id}`}
                className="segmented__pill"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="segmented__label">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
