import { SketchCheckbox } from '../sketch/SketchCheckbox.tsx'

interface SettingsToggleProps {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

/** A sketch checkbox with a visible, clickable label (and optional hint). */
export function SettingsToggle({
  id,
  label,
  hint,
  checked,
  onChange,
}: SettingsToggleProps) {
  return (
    <div className="settings__toggle">
      <SketchCheckbox
        id={id}
        checked={checked}
        onChange={onChange}
        label={label}
      />
      <label htmlFor={id}>
        {label}
        {hint && <span className="settings__hint">{hint}</span>}
      </label>
    </div>
  )
}
