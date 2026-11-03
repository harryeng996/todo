import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
  type MouseEvent,
} from 'react'
import {
  addDays,
  buildRangeGrid,
  formatLongDate,
  formatRange,
  monthLabels,
  type DateKey,
} from '../../lib/date.ts'
import { useTodos } from '../../state/useTodos.ts'
import { sketchOptions, useRough } from '../sketch/useRough.ts'
import { doneCountsByDay, levelFor } from './gridLevels.ts'
import { GridRangeFilter } from './GridRangeFilter.tsx'
import { resolveRange, useGridRange } from './useGridRange.ts'

interface DayGridProps {
  today: DateKey
  selectedDate: DateKey
  onSelect: (date: DateKey) => void
}

const WEEKDAY_LABELS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

// Arrow keys: rows are weekdays, columns are weeks.
const KEY_OFFSETS: Record<string, number> = {
  ArrowUp: -1,
  ArrowDown: 1,
  ArrowLeft: -7,
  ArrowRight: 7,
}

function describe(done: number, date: DateKey): string {
  const count = done === 0 ? 'No' : String(done)
  return `${count} ${done === 1 ? 'todo' : 'todos'} done on ${formatLongDate(date)}`
}

/** GitHub-style grid for a chosen date range; one cell per day, coloured by completed todos. */
export function DayGrid({ today, selectedDate, onSelect }: DayGridProps) {
  const { todos } = useTodos()
  const [range, setRange] = useGridRange()
  const { from, to } = resolveRange(range, today)
  const lastDay = to < today ? to : today
  const columns = useMemo(
    () => buildRangeGrid(from, to, today),
    [from, to, today],
  )
  const months = useMemo(() => monthLabels(columns), [columns])
  const firstDay = from

  const { counts, maxDone, total } = useMemo(() => {
    const counts = doneCountsByDay(todos)
    let maxDone = 0
    let total = 0
    for (const [date, done] of counts) {
      if (date < firstDay || date > lastDay) continue
      maxDone = Math.max(maxDone, done)
      total += done
    }
    return { counts, maxDone, total }
  }, [todos, firstDay, lastDay])

  const gridRef = useRef<HTMLDivElement>(null)
  const [focusDate, setFocusDate] = useState(selectedDate)
  const [keyboardMoved, setKeyboardMoved] = useState(false)

  // Keep the tab stop on the selected day when it changes from outside (e.g. "back to today").
  const [prevSelected, setPrevSelected] = useState(selectedDate)
  if (selectedDate !== prevSelected) {
    setPrevSelected(selectedDate)
    setFocusDate(selectedDate)
  }

  useEffect(() => {
    if (!keyboardMoved) return
    gridRef.current
      ?.querySelector<HTMLElement>(`[data-date="${focusDate}"]`)
      ?.focus()
  }, [focusDate, keyboardMoved])

  // One hand-drawn circle around the selected day.
  const svgRef = useRough((rc) => {
    const cell = gridRef.current?.querySelector<HTMLElement>(
      `[data-date="${selectedDate}"]`,
    )
    if (!cell) return []
    const cx = cell.offsetLeft + cell.offsetWidth / 2
    const cy = cell.offsetTop + cell.offsetHeight / 2
    return rc.ellipse(cx, cy, 24, 22, {
      ...sketchOptions,
      strokeWidth: 1.5,
      seed: 5,
    })
  }, `${selectedDate}|${today}|${from}|${to}`)

  function select(date: DateKey) {
    setFocusDate(date)
    onSelect(date)
  }

  function handleClick(event: MouseEvent<HTMLDivElement>) {
    const date = (event.target as HTMLElement).closest<HTMLElement>(
      '[data-date]',
    )?.dataset.date
    if (date) {
      setKeyboardMoved(false)
      select(date)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      select(focusDate)
      return
    }
    const offset = KEY_OFFSETS[event.key]
    if (offset === undefined) return
    event.preventDefault()
    const next = addDays(focusDate, offset)
    if (next < firstDay || next > lastDay) return
    setKeyboardMoved(true)
    setFocusDate(next)
  }

  return (
    <section className="day-grid-panel" aria-labelledby="day-grid-heading">
      <header className="day-grid-panel__header">
        <div>
          <h2 id="day-grid-heading" className="day-grid-panel__heading">
            {total} {total === 1 ? 'todo' : 'todos'} done
          </h2>
          <p id="day-grid-range" className="day-grid-panel__range">
            {formatRange(from, lastDay)}
          </p>
        </div>
        <GridRangeFilter range={range} today={today} onChange={setRange} />
      </header>
      {/* Grid and legend share a width, centred in the box. */}
      <div className="day-grid__body">
        <div className="day-grid__scroll">
          <div
            ref={gridRef}
            className="day-grid"
            style={{ '--weeks': columns.length } as CSSProperties}
            role="grid"
            aria-labelledby="day-grid-heading"
            aria-describedby="day-grid-range"
            onClick={handleClick}
            onKeyDown={handleKeyDown}
          >
            {months.map(({ column, label }) => (
              <span
                key={column}
                className="day-grid__month"
                style={{ gridColumn: column + 2 }}
                aria-hidden="true"
              >
                {label}
              </span>
            ))}
            {WEEKDAY_LABELS.map((label, day) => (
              <div key={day} role="row" className="day-grid__row">
                <span
                  className="day-grid__weekday"
                  style={{ gridRow: day + 2 }}
                  aria-hidden="true"
                >
                  {label}
                </span>
                {columns.map((days, week) => {
                  const date = days[day]
                  const position = { gridColumn: week + 2, gridRow: day + 2 }
                  if (!date) return null
                  const done = counts.get(date) ?? 0
                  const level = levelFor(done, maxDone)
                  const label = describe(done, date)
                  return (
                    <span
                      key={date}
                      role="gridcell"
                      data-date={date}
                      className={`day-grid__cell day-grid__cell--l${level}${date === today ? ' day-grid__cell--today' : ''}`}
                      style={position}
                      tabIndex={date === focusDate ? 0 : -1}
                      aria-selected={date === selectedDate}
                      aria-label={label}
                      title={label}
                    />
                  )
                })}
              </div>
            ))}
            <svg ref={svgRef} className="sketch-svg" aria-hidden="true" />
          </div>
        </div>
        <div className="day-grid__legend" aria-hidden="true">
          less
          {[0, 1, 2, 3, 4].map((level) => (
            <span
              key={level}
              className={`day-grid__cell day-grid__cell--l${level}`}
            />
          ))}
          more
        </div>
      </div>
    </section>
  )
}
