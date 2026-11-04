import { useState, type FormEvent } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { MAX_LENGTH } from '../../lib/limits.ts'
import type { TargetFields } from '../../types/target.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchInput } from '../sketch/SketchInput.tsx'

interface TargetFormProps {
  target: TargetFields | null
  today: DateKey
  /** null removes the target. */
  onSave: (target: TargetFields | null) => void
  onCancel: () => void
}

export function TargetForm({
  target,
  today,
  onSave,
  onCancel,
}: TargetFormProps) {
  const [title, setTitle] = useState(target?.title ?? '')
  const [startDate, setStartDate] = useState(target?.startDate ?? today)
  const [endDate, setEndDate] = useState(target?.endDate ?? '')
  const [error, setError] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!title.trim() || !startDate || !endDate) {
      setError('Fill in a name and both dates.')
    } else if (endDate < startDate) {
      setError('The final day must be on or after the start.')
    } else {
      onSave({ title: title.trim(), startDate, endDate })
    }
  }

  return (
    <form className="target-form" onSubmit={handleSubmit} noValidate>
      <label className="target-form__field target-form__field--wide">
        Target
        <SketchInput
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="e.g. Finish thesis"
          maxLength={MAX_LENGTH.title}
        />
      </label>
      <label className="target-form__field">
        Start
        <SketchInput
          type="date"
          value={startDate}
          onChange={(event) => setStartDate(event.target.value)}
        />
      </label>
      <label className="target-form__field">
        Final day
        <SketchInput
          type="date"
          value={endDate}
          min={startDate}
          onChange={(event) => setEndDate(event.target.value)}
        />
      </label>
      <div className="target-form__actions">
        <SketchButton type="submit" variant="primary">
          Save
        </SketchButton>
        <SketchButton onClick={onCancel}>Cancel</SketchButton>
        {target && (
          <SketchButton variant="ghost" onClick={() => onSave(null)}>
            Remove target
          </SketchButton>
        )}
      </div>
      {error && (
        <p className="target-form__error" role="alert">
          {error}
        </p>
      )}
    </form>
  )
}
