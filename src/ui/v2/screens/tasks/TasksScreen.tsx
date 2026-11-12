import { CalendarClock, ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { useMemo } from 'react'
import { doneCountsByDay } from '../../../../hooks/gridLevels.ts'
import {
  addDays,
  formatLongDate,
  relativeDayLabel,
  type DateKey,
} from '../../../../lib/date.ts'
import { todoComparison } from '../../../../state/todoStats.ts'
import { useTodos } from '../../../../state/useTodos.ts'
import { useToday } from '../../../../state/useToday.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card, ScreenBody, ScreenHeader } from '../../components/Card.tsx'
import { useConfetti } from '../../components/confettiContext.ts'
import { ProgressRing } from '../../components/ProgressRing.tsx'
import { Delta } from '../../components/StatTile.tsx'
import { TaskComposer } from '../../components/tasks/TaskComposer.tsx'
import { TaskList } from '../../components/tasks/TaskList.tsx'
import { replaceRoute, useRoute } from '../../lib/router.ts'
import { ActivityCard } from './ActivityCard.tsx'
import { DoneChartCard } from './DoneChartCard.tsx'
import { TaskInsights } from './TaskInsights.tsx'
import { WeekdayCard } from './WeekdayCard.tsx'
import { WeekStrip } from './WeekStrip.tsx'

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/

export function TasksScreen() {
  const today = useToday()
  const route = useRoute()
  const selected: DateKey =
    route.section && DATE_KEY.test(route.section) ? route.section : today
  const select = (date: DateKey) =>
    replaceRoute('tasks', date === today ? undefined : date)

  const { todos } = useTodos()
  const confetti = useConfetti()
  const doneByDay = useMemo(() => doneCountsByDay(todos), [todos])
  const dayTodos = todos.filter((t) => t.date === selected)
  const done = dayTodos.filter((t) => t.done).length
  // Today and later can be planned; past days are kept as they were (like v1).
  const editable = selected >= today
  const comparison = todoComparison(todos, selected)
  const planned = todos.filter((t) => t.date > today && !t.done).length

  let status: string
  if (selected > today) status = 'Planned ahead'
  else if (!dayTodos.length) status = 'Nothing on this day'
  else status = `${done} of ${dayTodos.length} done`

  return (
    <ScreenBody>
      <ScreenHeader
        eyebrow={selected === today ? formatLongDate(today) : 'Tasks'}
        title={relativeDayLabel(selected, today)}
        subtitle={
          planned
            ? `${planned} ${planned === 1 ? 'task' : 'tasks'} planned for the days ahead.`
            : 'Plan today and the days ahead; past days are kept as a record.'
        }
        actions={
          <>
            <IconButton
              label="Previous day"
              variant="secondary"
              onClick={() => select(addDays(selected, -1))}
            >
              <ChevronLeft size={18} />
            </IconButton>
            <input
              className="input"
              type="date"
              aria-label="Go to date"
              value={selected}
              onChange={(e) =>
                DATE_KEY.test(e.target.value) && select(e.target.value)
              }
            />
            <IconButton
              label="Next day"
              variant="secondary"
              onClick={() => select(addDays(selected, 1))}
            >
              <ChevronRight size={18} />
            </IconButton>
            {selected !== today && (
              <Button variant="soft" onClick={() => select(today)}>
                Today
              </Button>
            )}
          </>
        }
      />

      <div className="tasks-layout">
        <Card className="day-card">
          <WeekStrip
            selected={selected}
            today={today}
            todos={todos}
            onSelect={select}
          />
          <div className="day-card__head">
            <ProgressRing
              key={`ring-${selected}`}
              value={dayTodos.length ? done / dayTodos.length : 0}
              size={60}
              stroke={6}
            >
              <span className="ring__pct num">
                {dayTodos.length
                  ? `${Math.round((done / dayTodos.length) * 100)}%`
                  : '–'}
              </span>
            </ProgressRing>
            <div className="day-card__text">
              <h2>{status}</h2>
              {selected <= today && (
                <p className="day-card__compare">
                  <Delta
                    change={comparison.done - comparison.previousDay}
                    suffix={`vs the day before (${comparison.previousDay})`}
                  />
                  <Delta
                    change={comparison.done - comparison.average5}
                    format={(v) => v.toFixed(1)}
                    suffix={`vs 5-day average (${comparison.average5.toFixed(1)})`}
                  />
                </p>
              )}
            </div>
            {!editable && (
              <span className="chip" title="Past days can't be changed">
                <Lock size={13} /> Read-only
              </span>
            )}
            {selected > today && (
              <span className="chip chip--accent">
                <CalendarClock size={13} /> Upcoming
              </span>
            )}
          </div>
          {editable && (
            <TaskComposer key={`composer-${selected}`} date={selected} />
          )}
          <TaskList
            key={`list-${selected}`}
            todos={dayTodos}
            editable={editable}
            empty={
              editable
                ? 'Nothing planned yet. Add a task above.'
                : 'Nothing was on the list this day.'
            }
            onCompleted={(left) =>
              left === 0 && selected === today && confetti()
            }
          />
        </Card>

        <div className="tasks-layout__side">
          <TaskInsights todos={todos} doneByDay={doneByDay} today={today} />
          <WeekdayCard doneByDay={doneByDay} today={today} />
        </div>
      </div>

      <DoneChartCard
        doneByDay={doneByDay}
        today={today}
        selected={selected}
        onSelect={select}
      />
      <ActivityCard
        doneByDay={doneByDay}
        today={today}
        selected={selected}
        onSelect={select}
      />
    </ScreenBody>
  )
}
