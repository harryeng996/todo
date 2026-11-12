import { CheckCheck, Flame, Gauge, Trophy } from 'lucide-react'
import { addDays, formatDayMonth, type DateKey } from '../../../../lib/date.ts'
import type { Todo } from '../../../../types/todo.ts'
import { AnimatedNumber } from '../../components/AnimatedNumber.tsx'
import { Delta, StatTile } from '../../components/StatTile.tsx'
import { streakOf, sumDays, taskTotals } from '../../lib/stats.ts'

interface TaskInsightsProps {
  todos: readonly Todo[]
  doneByDay: Map<DateKey, number>
  today: DateKey
}

const pct = (v: number) => `${Math.round(v)}%`

export function TaskInsights({ todos, doneByDay, today }: TaskInsightsProps) {
  const week = taskTotals(todos as Todo[], addDays(today, -6), today)
  const prevWeek = taskTotals(
    todos as Todo[],
    addDays(today, -13),
    addDays(today, -7),
  )
  const avg30 = sumDays(doneByDay, today, 30) / 30
  const prevAvg30 = sumDays(doneByDay, addDays(today, -30), 30) / 30
  const streak = streakOf(doneByDay, today)
  const totalDone = todos.filter((t) => t.done && t.date <= today).length
  const first = todos.reduce<DateKey | null>(
    (min, t) => (!min || t.date < min ? t.date : min),
    null,
  )

  return (
    <div className="insights">
      <StatTile
        label="Done rate · 7d"
        icon={<Gauge size={16} />}
        value={
          week.rate === null ? (
            '—'
          ) : (
            <AnimatedNumber value={week.rate * 100} format={pct} />
          )
        }
        footer={
          <Delta
            change={
              week.rate !== null && prevWeek.rate !== null
                ? (week.rate - prevWeek.rate) * 100
                : null
            }
            format={(v) => `${Math.round(v)} pts`}
            suffix="vs prior week"
          />
        }
      />
      <StatTile
        label="Daily avg · 30d"
        icon={<CheckCheck size={16} />}
        tone="var(--break)"
        value={<AnimatedNumber value={avg30} format={(v) => v.toFixed(1)} />}
        unit="/ day"
        footer={
          <Delta
            change={avg30 - prevAvg30}
            format={(v) => v.toFixed(1)}
            suffix="vs prior 30"
          />
        }
      />
      <StatTile
        label="Streak"
        icon={<Flame size={16} />}
        tone="var(--warn)"
        value={<AnimatedNumber value={streak.current} />}
        unit={streak.current === 1 ? 'day' : 'days'}
        footer={
          <span className="stat__caption">
            Best {streak.best} {streak.best === 1 ? 'day' : 'days'}
          </span>
        }
      />
      <StatTile
        label="All time"
        icon={<Trophy size={16} />}
        tone="var(--body)"
        value={<AnimatedNumber value={totalDone} />}
        unit="done"
        footer={
          <span className="stat__caption">
            {first ? `Since ${formatDayMonth(first)}` : 'Nothing yet'}
          </span>
        }
      />
    </div>
  )
}
