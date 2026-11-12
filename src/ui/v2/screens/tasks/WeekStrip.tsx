import { ChevronLeft, ChevronRight } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import {
  addDays,
  dayOfWeek,
  parseDateKey,
  type DateKey,
} from '../../../../lib/date.ts'
import type { Todo } from '../../../../types/todo.ts'
import { IconButton } from '../../components/Button.tsx'

interface WeekStripProps {
  selected: DateKey
  today: DateKey
  todos: readonly Todo[]
  onSelect: (date: DateKey) => void
}

const mondayOf = (d: DateKey) => addDays(d, -((dayOfWeek(d) + 6) % 7))

/** Mon–Sun of the selected week; each day shows how much of its list is done. */
export function WeekStrip({
  selected,
  today,
  todos,
  onSelect,
}: WeekStripProps) {
  const monday = mondayOf(selected)
  // Slide direction for the week change animation.
  const [direction, setDirection] = useState(0)
  const [shownMonday, setShownMonday] = useState(monday)
  if (monday !== shownMonday) {
    setDirection(monday > shownMonday ? 1 : -1)
    setShownMonday(monday)
  }

  const stats = useMemo(() => {
    const map = new Map<DateKey, { done: number; total: number }>()
    for (const t of todos) {
      const s = map.get(t.date) ?? { done: 0, total: 0 }
      s.total++
      if (t.done) s.done++
      map.set(t.date, s)
    }
    return map
  }, [todos])

  const days = Array.from({ length: 7 }, (_, i) => addDays(monday, i))
  const month = parseDateKey(monday).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  return (
    <div className="week">
      <div className="week__bar">
        <span className="week__month">{month}</span>
        <div className="week__nav">
          <IconButton
            label="Previous week"
            size="sm"
            onClick={() => onSelect(addDays(selected, -7))}
          >
            <ChevronLeft size={17} />
          </IconButton>
          <IconButton
            label="Next week"
            size="sm"
            onClick={() => onSelect(addDays(selected, 7))}
          >
            <ChevronRight size={17} />
          </IconButton>
        </div>
      </div>
      <div className="week__viewport">
        <AnimatePresence mode="popLayout" initial={false} custom={direction}>
          <motion.div
            key={monday}
            className="week__days"
            custom={direction}
            initial={{ opacity: 0, x: direction * 40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -40 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
          >
            {days.map((day) => {
              const s = stats.get(day)
              const rate = s?.total ? s.done / s.total : 0
              const isSelected = day === selected
              const date = parseDateKey(day)
              return (
                <button
                  key={day}
                  type="button"
                  className={`week__day ${day === today ? 'is-today' : ''} ${day > today ? 'is-future' : ''}`}
                  aria-pressed={isSelected}
                  aria-label={`${date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })}${s ? `, ${s.done} of ${s.total} done` : ''}`}
                  onClick={() => onSelect(day)}
                >
                  {isSelected && (
                    <motion.span
                      layoutId="week-selected"
                      className="week__selected"
                      transition={{
                        type: 'spring',
                        stiffness: 500,
                        damping: 38,
                      }}
                    />
                  )}
                  <span className="week__weekday">
                    {date.toLocaleDateString('en-GB', { weekday: 'short' })}
                  </span>
                  <span className="week__date num">{date.getDate()}</span>
                  <span className="week__meter" aria-hidden="true">
                    {s?.total ? (
                      <span
                        className="week__meter-fill"
                        style={{ transform: `scaleX(${rate})` }}
                      />
                    ) : null}
                  </span>
                </button>
              )
            })}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}
