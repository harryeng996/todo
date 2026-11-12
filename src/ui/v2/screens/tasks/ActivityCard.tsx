import { Grid3x3 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { daysBetween, formatRange, type DateKey } from '../../../../lib/date.ts'
import {
  rangeProblem,
  resolveRange,
  useGridRange,
  type GridRange,
} from '../../../../hooks/useGridRange.ts'
import { Heatmap } from '../../charts/Heatmap.tsx'
import { useWidth } from '../../charts/useWidth.ts'
import { Card } from '../../components/Card.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { sumDays } from '../../lib/stats.ts'

const PRESETS = [
  { value: '1m', label: '1M' },
  { value: '3m', label: '3M' },
  { value: '6m', label: '6M' },
  { value: '1y', label: '1Y' },
  { value: 'custom', label: 'Custom' },
] as const

interface ActivityCardProps {
  doneByDay: Map<DateKey, number>
  today: DateKey
  selected: DateKey
  onSelect: (date: DateKey) => void
}

/** The activity heatmap with a date-range filter (shared with v1's grid setting). */
export function ActivityCard({
  doneByDay,
  today,
  selected,
  onSelect,
}: ActivityCardProps) {
  const [range, setRange] = useGridRange()
  const { from, to } = resolveRange(range, today)
  const [draft, setDraft] = useState({ from, to })
  const problem =
    range.preset === 'custom' ? rangeProblem(draft.from, draft.to, today) : null
  const [ref, width] = useWidth<HTMLDivElement>(800)
  const weeks = Math.ceil((daysBetween(from, to) + 7) / 7)
  const cell = Math.min(Math.max(Math.floor((width - 36) / weeks) - 3, 11), 26)
  const total = sumDays(doneByDay, to, daysBetween(from, to) + 1)

  function choose(preset: GridRange['preset']) {
    if (preset === 'custom') {
      setDraft({ from, to })
      setRange({ preset: 'custom', from, to })
    } else setRange({ preset })
  }

  function edit(next: { from: DateKey; to: DateKey }) {
    setDraft(next)
    if (!rangeProblem(next.from, next.to, today))
      setRange({ preset: 'custom', ...next })
  }

  return (
    <Card
      icon={<Grid3x3 size={16} />}
      title="Activity"
      subtitle={`${total} done · ${formatRange(from, to)}`}
      action={
        <Segmented
          label="Activity range"
          size="sm"
          options={PRESETS}
          value={range.preset}
          onChange={choose}
        />
      }
    >
      <AnimatePresence initial={false}>
        {range.preset === 'custom' && (
          <motion.div
            className="range-fields"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
          >
            <label>
              From
              <input
                className="input"
                type="date"
                value={draft.from}
                max={today}
                onChange={(e) => edit({ ...draft, from: e.target.value })}
              />
            </label>
            <label>
              To
              <input
                className="input"
                type="date"
                value={draft.to}
                max={today}
                onChange={(e) => edit({ ...draft, to: e.target.value })}
              />
            </label>
            {problem && <p className="range-fields__error">{problem}</p>}
          </motion.div>
        )}
      </AnimatePresence>
      <div ref={ref}>
        <Heatmap
          key={`${from}${to}`}
          from={from}
          to={to}
          today={today}
          counts={doneByDay}
          describe={(n) => `${n} ${n === 1 ? 'task' : 'tasks'} done`}
          selected={selected}
          onSelect={onSelect}
          cell={cell}
        />
      </div>
    </Card>
  )
}
