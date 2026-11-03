import { X } from 'lucide-react'
import { useEffect, useRef, type MouseEvent } from 'react'
import type { Settings } from '../../state/useSettings.ts'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchCheckbox } from '../sketch/SketchCheckbox.tsx'

interface SettingsDialogProps {
  open: boolean
  onClose: () => void
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  /** The music player can be switched off in code (see features.ts). */
  showMusic?: boolean
}

interface ToggleProps {
  id: string
  label: string
  hint?: string
  checked: boolean
  onChange: (checked: boolean) => void
}

function Toggle({ id, label, hint, checked, onChange }: ToggleProps) {
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

/** The app's only dialog: which panels are shown, plus feature switches. */
export function SettingsDialog({
  open,
  onClose,
  settings,
  onChange,
  showMusic = true,
}: SettingsDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  // A click on the backdrop lands on the <dialog> itself, not its content.
  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose()
  }

  return (
    <dialog
      ref={dialogRef}
      className="settings"
      aria-labelledby="settings-heading"
      onClose={onClose}
      onClick={handleClick}
    >
      <SketchBox seed={61} className="settings__box">
        <header className="settings__header">
          <h2 id="settings-heading">Settings</h2>
          <SketchButton
            variant="ghost"
            onClick={onClose}
            aria-label="Close settings"
          >
            <X size={20} strokeWidth={1.75} aria-hidden="true" />
          </SketchButton>
        </header>

        <fieldset className="settings__group">
          <legend>Panels</legend>
          {showMusic && (
            <Toggle
              id="setting-music"
              label="Music player"
              checked={settings.music}
              onChange={(music) => onChange({ music })}
            />
          )}
          <Toggle
            id="setting-youtube"
            label="YouTube videos"
            checked={settings.youtube}
            onChange={(youtube) => onChange({ youtube })}
          />
        </fieldset>

        <fieldset className="settings__group">
          <legend>
            Plus features <span className="settings__plus">plus</span>
          </legend>
          <Toggle
            id="setting-weight"
            label="Weight tracking"
            hint="Log your weight and one photo per day. Stored only in this browser."
            checked={settings.weightTracking}
            onChange={(weightTracking) => onChange({ weightTracking })}
          />
          {settings.weightTracking && (
            <div
              className="settings__unit"
              role="radiogroup"
              aria-label="Weight unit"
            >
              {(['kg', 'lb'] as const).map((unit) => (
                <label key={unit} className="settings__radio">
                  <input
                    type="radio"
                    name="weight-unit"
                    value={unit}
                    checked={settings.weightUnit === unit}
                    onChange={() => onChange({ weightUnit: unit })}
                  />
                  {unit}
                </label>
              ))}
            </div>
          )}
        </fieldset>

        <p className="settings__note">
          Turning a panel off only hides it. Your data is kept.
        </p>
      </SketchBox>
    </dialog>
  )
}
