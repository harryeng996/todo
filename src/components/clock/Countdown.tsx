import { Pencil, Plus } from 'lucide-react'
import { useState } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { countdownFor, useTargets } from '../../state/useTarget.ts'
import type { Target } from '../../types/target.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchProgress } from '../sketch/SketchProgress.tsx'
import { seedFrom } from '../sketch/useRough.ts'
import { TargetForm } from './TargetForm.tsx'

const icon = { size: 18, strokeWidth: 1.75, 'aria-hidden': true } as const

function CountdownLine({
  target,
  today,
  onEdit,
}: {
  target: Target
  today: DateKey
  onEdit: () => void
}) {
  const { progress, status } = countdownFor(target, today)
  const percent = Math.round(progress * 100)

  return (
    <div className="countdown">
      <span className="countdown__title">{target.title}</span>
      <SketchProgress
        className="countdown__line"
        value={progress}
        label={`Progress towards ${target.title}`}
        valueText={`${percent}%, ${status}`}
        seed={seedFrom(target.id)}
      />
      <span className="countdown__meta">
        {percent}% · {status}
        <SketchButton
          variant="ghost"
          onClick={onEdit}
          aria-label={`Edit target "${target.title}"`}
        >
          <Pencil {...icon} />
        </SketchButton>
      </span>
    </div>
  )
}

/** One countdown line per objective, each editable inline, plus "add". */
export function Countdown({ today }: { today: DateKey }) {
  const { targets, saveTarget, removeTarget } = useTargets()
  // A target's id while editing it, 'new' while adding one.
  const [editing, setEditing] = useState<string | null>(null)
  const done = () => setEditing(null)

  return (
    <div className="countdowns">
      {targets.map((target) =>
        editing === target.id ? (
          <TargetForm
            key={target.id}
            target={target}
            today={today}
            onSave={(fields) => {
              if (fields) saveTarget({ ...fields, id: target.id })
              else removeTarget(target.id)
              done()
            }}
            onCancel={done}
          />
        ) : (
          <CountdownLine
            key={target.id}
            target={target}
            today={today}
            onEdit={() => setEditing(target.id)}
          />
        ),
      )}
      {editing === 'new' ? (
        <TargetForm
          target={null}
          today={today}
          onSave={(fields) => {
            if (fields) saveTarget({ ...fields, id: crypto.randomUUID() })
            done()
          }}
          onCancel={done}
        />
      ) : (
        <SketchButton
          variant="ghost"
          className="countdowns__add"
          onClick={() => setEditing('new')}
        >
          {targets.length ? <Plus {...icon} /> : <Pencil {...icon} />}
          {targets.length ? 'Add target' : 'Set a target'}
        </SketchButton>
      )}
    </div>
  )
}
