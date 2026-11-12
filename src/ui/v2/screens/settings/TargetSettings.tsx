import { Pencil, Plus, Target as TargetIcon, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import { formatDayShort, type DateKey } from '../../../../lib/date.ts'
import { MAX_LENGTH } from '../../../../lib/limits.ts'
import { countdownFor } from '../../../../state/useTarget.ts'
import { useToday } from '../../../../state/useToday.ts'
import type { Target, TargetFields } from '../../../../types/target.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { useTargetList } from '../../state/appContext.ts'

/** Countdown targets: add, edit inline, remove. */
export function TargetSettings({ id }: { id: string }) {
  const today = useToday()
  const { targets, saveTarget, removeTarget } = useTargetList()
  // 'new', a target id, or null.
  const [editing, setEditing] = useState<string | null>(null)
  const [confirm, setConfirm] = useState<string | null>(null)

  return (
    <Card
      id={id}
      icon={<TargetIcon size={16} />}
      title="Targets"
      subtitle="Dated goals counted down on Home"
      action={
        <Button
          variant="soft"
          size="sm"
          onClick={() => setEditing('new')}
          disabled={editing === 'new'}
        >
          <Plus size={15} /> Add
        </Button>
      }
    >
      <AnimatePresence initial={false}>
        {editing === 'new' && (
          <TargetForm
            key="new"
            today={today}
            onCancel={() => setEditing(null)}
            onSave={(fields) => {
              saveTarget({ ...fields, id: crypto.randomUUID() })
              setEditing(null)
            }}
          />
        )}
      </AnimatePresence>
      {targets.length === 0 && editing !== 'new' && (
        <p className="empty">
          No targets yet. Add one, like an exam date or a launch.
        </p>
      )}
      <ul className="setting-list">
        <AnimatePresence initial={false}>
          {targets.map((t: Target) => (
            <motion.li
              key={t.id}
              layout
              className="setting-list__item"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, height: 0 }}
            >
              {editing === t.id ? (
                <TargetForm
                  target={t}
                  today={today}
                  onCancel={() => setEditing(null)}
                  onSave={(fields) => {
                    saveTarget({ ...fields, id: t.id })
                    setEditing(null)
                  }}
                />
              ) : (
                <div className="setting-row">
                  <div className="setting-row__main">
                    <strong>{t.title}</strong>
                    <span className="subtle">
                      {formatDayShort(t.startDate)} →{' '}
                      {formatDayShort(t.endDate)} ·{' '}
                      {countdownFor(t, today).status}
                    </span>
                  </div>
                  <IconButton
                    label={`Edit ${t.title}`}
                    size="sm"
                    onClick={() => setEditing(t.id)}
                  >
                    <Pencil size={14} />
                  </IconButton>
                  {confirm === t.id ? (
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => removeTarget(t.id)}
                      onBlur={() => setConfirm(null)}
                      autoFocus
                    >
                      Remove?
                    </Button>
                  ) : (
                    <IconButton
                      label={`Remove ${t.title}`}
                      size="sm"
                      onClick={() => setConfirm(t.id)}
                    >
                      <Trash2 size={14} />
                    </IconButton>
                  )}
                </div>
              )}
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </Card>
  )
}

interface TargetFormProps {
  target?: Target
  today: DateKey
  onSave: (fields: TargetFields) => void
  onCancel: () => void
}

function TargetForm({ target, today, onSave, onCancel }: TargetFormProps) {
  const [title, setTitle] = useState(target?.title ?? '')
  const [startDate, setStartDate] = useState(target?.startDate ?? today)
  const [endDate, setEndDate] = useState(target?.endDate ?? '')
  const [error, setError] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    if (!title.trim() || !startDate || !endDate)
      setError('Fill in a name and both dates.')
    else if (endDate < startDate)
      setError('The final day must be on or after the start.')
    else onSave({ title: title.trim(), startDate, endDate })
  }

  return (
    <motion.form
      className="inline-form"
      onSubmit={submit}
      noValidate
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
    >
      <div className="inline-form__grid">
        <label className="inline-form__wide">
          Name
          <input
            className="input"
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Finish thesis"
            maxLength={MAX_LENGTH.title}
          />
        </label>
        <label>
          Start
          <input
            className="input"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </label>
        <label>
          Final day
          <input
            className="input"
            type="date"
            value={endDate}
            min={startDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </label>
      </div>
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
      <div className="inline-form__actions">
        <Button onClick={onCancel}>Cancel</Button>
        <Button type="submit" variant="primary">
          Save
        </Button>
      </div>
    </motion.form>
  )
}
