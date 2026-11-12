import { motion } from 'motion/react'
import { useMemo, type KeyboardEvent } from 'react'
import {
  addDays,
  buildRangeGrid,
  formatDayShort,
  monthLabels,
  type DateKey,
} from '../../../lib/date.ts'
import { levelFor } from '../../../hooks/gridLevels.ts'

interface HeatmapProps {
  from: DateKey
  to: DateKey
  today: DateKey
  counts: Map<DateKey, number>
  /** e.g. n => `${n} done` */
  describe: (count: number) => string
  selected?: DateKey
  onSelect?: (date: DateKey) => void
  /** Cell side in px. */
  cell?: number
}

const WEEKDAYS = ['', 'Mon', '', 'Wed', '', 'Fri', '']

/** A GitHub-style activity grid; cells fade in column by column. */
export function Heatmap({
  from,
  to,
  today,
  counts,
  describe,
  selected,
  onSelect,
  cell = 14,
}: HeatmapProps) {
  const columns = useMemo(
    () => buildRangeGrid(from, to, today),
    [from, to, today],
  )
  const labels = useMemo(() => monthLabels(columns), [columns])
  const max = useMemo(() => {
    let m = 0
    for (const days of columns)
      for (const d of days) if (d) m = Math.max(m, counts.get(d) ?? 0)
    return m
  }, [columns, counts])
  const gap = 3

  // Arrow keys move between days: up/down one day, left/right one week.
  function moveFocus(event: KeyboardEvent<HTMLDivElement>) {
    const delta = { ArrowUp: -1, ArrowDown: 1, ArrowLeft: -7, ArrowRight: 7 }[
      event.key
    ]
    const current = (event.target as HTMLElement).dataset.date
    if (!delta || !current) return
    event.preventDefault()
    event.currentTarget
      .querySelector<HTMLElement>(`[data-date="${addDays(current, delta)}"]`)
      ?.focus()
  }
  const step = cell + gap

  return (
    <div className="heatmap scroll">
      <div
        className="heatmap__inner"
        style={{
          ['--cell' as string]: `${cell}px`,
          ['--gap' as string]: `${gap}px`,
        }}
      >
        <div
          className="heatmap__months"
          style={{ width: columns.length * step }}
        >
          {labels.map((l) => (
            <span
              key={`${l.column}${l.label}`}
              style={{ left: l.column * step }}
            >
              {l.label}
            </span>
          ))}
        </div>
        <div className="heatmap__body">
          <div className="heatmap__weekdays" aria-hidden="true">
            {WEEKDAYS.map((d, i) => (
              <span key={i}>{d}</span>
            ))}
          </div>
          <div
            className="heatmap__grid"
            role="group"
            aria-label="Activity by day"
            onKeyDown={onSelect ? moveFocus : undefined}
          >
            {columns.map((days, col) => (
              <div key={col} className="heatmap__col">
                {days.map((day, row) => {
                  if (!day)
                    return (
                      <span
                        key={row}
                        className="heatmap__cell heatmap__cell--empty"
                      />
                    )
                  const count = counts.get(day) ?? 0
                  const level = levelFor(count, max)
                  const text = `${formatDayShort(day)}: ${describe(count)}`
                  return (
                    <motion.button
                      key={row}
                      type="button"
                      data-date={day}
                      className={`heatmap__cell ${day === selected ? 'is-selected' : ''} ${day === today ? 'is-today' : ''}`}
                      style={{ background: `var(--heat-${level})` }}
                      aria-label={text}
                      aria-pressed={onSelect ? day === selected : undefined}
                      title={text}
                      tabIndex={
                        onSelect && day === (selected ?? today) ? 0 : -1
                      }
                      disabled={!onSelect}
                      onClick={() => onSelect?.(day)}
                      initial={{ opacity: 0, scale: 0.6 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={onSelect ? { scale: 1.25 } : undefined}
                      transition={{
                        duration: 0.3,
                        delay: Math.min(col * 0.012, 0.6),
                      }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
        <div className="heatmap__legend" aria-hidden="true">
          Less
          {[0, 1, 2, 3, 4].map((l) => (
            <span
              key={l}
              className="heatmap__cell"
              style={{ background: `var(--heat-${l})` }}
            />
          ))}
          More
        </div>
      </div>
    </div>
  )
}
