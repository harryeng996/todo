import { Flag, Pencil } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { addDays, formatDayShort, type DateKey } from '../../../../lib/date.ts'
import {
  formatWeight,
  parseWeight,
  toUnit,
  type WeightUnit,
} from '../../../../lib/weight.ts'
import { Button } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { ProgressRing } from '../../components/ProgressRing.tsx'
import { Sheet } from '../../components/Sheet.tsx'
import {
  daysToGoal,
  goalProgress,
  weeklyRate,
  type DayValue,
} from '../../lib/stats.ts'
import { setWeightGoal, useWeightGoal } from '../../state/weightGoal.ts'

interface GoalCardProps {
  /** Weigh-ins in kg, oldest first. */
  kgPoints: DayValue[]
  today: DateKey
  unit: WeightUnit
}

/** Progress from the first weigh-in towards a goal weight, with an estimated date. */
export function GoalCard({ kgPoints, today, unit }: GoalCardProps) {
  const goal = useWeightGoal()
  const [editing, setEditing] = useState(false)
  const start = kgPoints[0]
  const current = kgPoints.at(-1)
  const recent = kgPoints.filter((p) => p.date >= addDays(today, -29))
  const rate = weeklyRate(recent)

  let body
  if (goal === null || !start || !current) {
    body = (
      <div className="goal goal--empty">
        <p className="empty">
          {goal === null
            ? 'Set a goal weight to see your progress and an estimated date.'
            : 'Log a weigh-in to start tracking progress.'}
        </p>
        <Button variant="soft" onClick={() => setEditing(true)}>
          <Flag size={15} />{' '}
          {goal === null ? 'Set a goal' : `Goal ${formatWeight(goal, unit)}`}
        </Button>
      </div>
    )
  } else {
    const progress = goalProgress(start.value, current.value, goal)
    const remaining = goal - current.value
    const days = daysToGoal(current.value, goal, rate)
    let eta: string
    if (days === 0) eta = 'Goal reached 🎉'
    else if (days === null)
      eta =
        rate === null
          ? 'Keep logging to estimate a date'
          : 'Recent trend is heading away from it'
    else eta = `At this pace, around ${formatDayShort(addDays(today, days))}`
    body = (
      <div className="goal">
        <ProgressRing
          value={progress}
          size={112}
          stroke={10}
          color="var(--body)"
        >
          <span className="goal__pct num">{Math.round(progress * 100)}%</span>
          <span className="goal__of">of the way</span>
        </ProgressRing>
        <dl className="goal__facts">
          <div>
            <dt>Goal</dt>
            <dd className="num">{formatWeight(goal, unit)}</dd>
          </div>
          <div>
            <dt>To go</dt>
            <dd className="num">
              {Math.abs(remaining) < 0.05
                ? '—'
                : formatWeight(Math.abs(remaining), unit)}
            </dd>
          </div>
          <div>
            <dt>Started</dt>
            <dd className="num">{formatWeight(start.value, unit)}</dd>
          </div>
        </dl>
        <p className="goal__eta">{eta}</p>
      </div>
    )
  }

  return (
    <Card
      icon={<Flag size={16} />}
      title="Goal"
      action={
        goal !== null && (
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil size={14} /> Edit
          </Button>
        )
      }
    >
      {body}
      <GoalSheet
        open={editing}
        onClose={() => setEditing(false)}
        unit={unit}
        goal={goal}
      />
    </Card>
  )
}

function GoalSheet({
  open,
  onClose,
  unit,
  goal,
}: {
  open: boolean
  onClose: () => void
  unit: WeightUnit
  goal: number | null
}) {
  const [text, setText] = useState('')
  const [error, setError] = useState('')
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) {
      setText(goal === null ? '' : toUnit(goal, unit).toFixed(1))
      setError('')
    }
  }

  function save(event: FormEvent) {
    event.preventDefault()
    const kg = parseWeight(text, unit)
    if (kg === null) {
      setError('Enter a plausible weight.')
      return
    }
    setWeightGoal(kg)
    onClose()
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Goal weight"
      description="Only used to show progress here."
    >
      <form className="goal-form" onSubmit={save}>
        <label className="weigh__value">
          <input
            data-autofocus
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={`Goal in ${unit}`}
            placeholder="0.0"
            className="num"
          />
          <span>{unit}</span>
        </label>
        {error && <p className="field-error">{error}</p>}
        <div className="weigh__actions">
          {goal !== null && (
            <Button
              variant="ghost"
              onClick={() => {
                setWeightGoal(null)
                onClose()
              }}
            >
              Remove goal
            </Button>
          )}
          <span className="weigh__spacer" />
          <Button onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary">
            Save
          </Button>
        </div>
      </form>
    </Sheet>
  )
}
