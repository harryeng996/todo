import { Check, Trash2, X } from 'lucide-react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  MAX_KG,
  MIN_KG,
  parseWeight,
  toUnit,
  type WeightUnit,
} from '../../lib/weight.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchInput } from '../sketch/SketchInput.tsx'

interface WeightEditorProps {
  kg: number | null
  unit: WeightUnit
  onSave: (kg: number) => void
  onCancel: () => void
  /** Shown as a 🗑 icon when given (e.g. remove this weight / delete this entry). */
  onRemove?: () => void
  removeLabel?: string
}

const icon = { size: 18, strokeWidth: 1.75, 'aria-hidden': true } as const

/** Shown only while editing: input plus save / cancel / remove icons. Esc cancels. */
export function WeightEditor({
  kg,
  unit,
  onSave,
  onCancel,
  onRemove,
  removeLabel = 'Remove weight',
}: WeightEditorProps) {
  const [draft, setDraft] = useState(
    kg === null ? '' : toUnit(kg, unit).toFixed(1),
  )
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const parsed = parseWeight(draft, unit)
    if (parsed === null) {
      const range = `${toUnit(MIN_KG, unit).toFixed(0)}–${toUnit(MAX_KG, unit).toFixed(0)} ${unit}`
      setError(`Enter a weight between ${range}.`)
      return
    }
    onSave(parsed)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key === 'Escape') {
      event.stopPropagation()
      onCancel()
    }
  }

  return (
    <form
      className="weight__form"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
      noValidate
    >
      <SketchInput
        className="weight__input"
        inputMode="decimal"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="0.0"
        aria-label={`Weight in ${unit}`}
        autoFocus
      />
      <span className="weight__unit">{unit}</span>
      <SketchButton type="submit" variant="primary" aria-label="Save weight">
        <Check {...icon} />
      </SketchButton>
      <SketchButton variant="ghost" onClick={onCancel} aria-label="Cancel">
        <X {...icon} />
      </SketchButton>
      {onRemove && (
        <SketchButton
          variant="ghost"
          className="weight__remove"
          onClick={onRemove}
          aria-label={removeLabel}
          title={removeLabel}
        >
          <Trash2 {...icon} />
        </SketchButton>
      )}
      {error && (
        <p className="weight__error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
