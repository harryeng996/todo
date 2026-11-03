import { Trash2, X } from 'lucide-react'
import { useEffect, useRef, useState, type MouseEvent } from 'react'
import { formatDayShort, type DateKey } from '../../lib/date.ts'
import {
  filterSessions,
  formatMinutes,
  NO_TASK,
  RANGE_LABELS,
  rangeStart,
  summarize,
  taskTitles,
  type StatsFilter,
  type StatsRange,
} from '../../state/pomodoro.ts'
import { usePomodoro } from '../../state/usePomodoro.ts'
import { ScrollLineChart } from '../charts/ScrollLineChart.tsx'
import { SketchBox } from '../sketch/SketchBox.tsx'
import { SketchButton } from '../sketch/SketchButton.tsx'

interface PomodoroStatsProps {
  open: boolean
  onClose: () => void
  today: DateKey
}

const clockTime = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

/** Focus statistics, filtered by date range and task. */
export function PomodoroStats({ open, onClose, today }: PomodoroStatsProps) {
  const { sessions, deleteSession } = usePomodoro()
  const [filter, setFilter] = useState<StatsFilter>({ range: '7d', task: '' })
  const dialogRef = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    else if (!open && dialog.open) dialog.close()
  }, [open])

  function handleClick(event: MouseEvent<HTMLDialogElement>) {
    if (event.target === dialogRef.current) onClose()
  }

  const from = rangeStart(filter.range, today, sessions)
  const shown = filterSessions(sessions, filter, today)
  const summary = summarize(shown, from, today)
  const tasks = taskTitles(sessions)
  const newestFirst = [...shown].sort((a, b) => b.end - a.end)

  return (
    <dialog
      ref={dialogRef}
      className="settings pomodoro-stats"
      aria-labelledby="pomodoro-stats-heading"
      onClose={onClose}
      onClick={handleClick}
    >
      {open && (
        <SketchBox seed={95} className="settings__box">
          <header className="settings__header">
            <h2 id="pomodoro-stats-heading">Pomodoro statistics</h2>
            <SketchButton
              variant="ghost"
              onClick={onClose}
              aria-label="Close statistics"
            >
              <X size={20} strokeWidth={1.75} aria-hidden="true" />
            </SketchButton>
          </header>

          <div className="settings__body sketch-scroll">
            <div className="pomodoro-stats__filters">
              <label>
                Range
                <select
                  className="sketch-border--alt"
                  value={filter.range}
                  onChange={(event) =>
                    setFilter({
                      ...filter,
                      range: event.target.value as StatsRange,
                    })
                  }
                >
                  {Object.entries(RANGE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Task
                <select
                  className="sketch-border--alt"
                  value={filter.task}
                  onChange={(event) =>
                    setFilter({ ...filter, task: event.target.value })
                  }
                >
                  <option value="">All tasks</option>
                  <option value={NO_TASK}>Without a task</option>
                  {tasks.map((title) => (
                    <option key={title} value={title}>
                      {title}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <dl className="pomodoro-stats__summary">
              <div>
                <dt>Focus time</dt>
                <dd>{formatMinutes(summary.minutes)}</dd>
              </div>
              <div>
                <dt>Sessions</dt>
                <dd>{summary.count}</dd>
              </div>
              <div>
                <dt>Daily average</dt>
                <dd>{formatMinutes(summary.perDayAverage)}</dd>
              </div>
            </dl>

            {filter.range !== 'today' && (
              <ScrollLineChart
                points={summary.perDay}
                start={from}
                end={today}
                label="Focus minutes per day"
                format={(value) => `${Math.round(value)} min`}
                fromZero
                seed={151}
              />
            )}

            {newestFirst.length === 0 ? (
              <p className="settings__hint">
                No focus sessions in this range yet.
              </p>
            ) : (
              <ol
                className="pomodoro-stats__list sketch-scroll"
                aria-label="Focus sessions"
              >
                {newestFirst.map((s) => (
                  <li key={s.id} className="pomodoro-stats__item">
                    <span className="pomodoro-stats__when">
                      {formatDayShort(s.date)} · {clockTime(s.start)}–
                      {clockTime(s.end)}
                    </span>
                    <span className="pomodoro-stats__task">
                      {s.taskTitle ?? '—'}
                    </span>
                    <span className="pomodoro-stats__minutes">
                      {s.minutes} min
                    </span>
                    <SketchButton
                      variant="ghost"
                      className="quote-list__delete"
                      onClick={() => deleteSession(s.id)}
                      aria-label={`Delete the ${clockTime(s.start)} session on ${formatDayShort(s.date)}`}
                    >
                      <Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />
                    </SketchButton>
                  </li>
                ))}
              </ol>
            )}
          </div>
        </SketchBox>
      )}
    </dialog>
  )
}
