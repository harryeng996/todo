import { useMemo } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { formatDelta } from '../../lib/format.ts'
import { doneSeries, todoComparison } from '../../state/todoStats.ts'
import { useTodos } from '../../state/useTodos.ts'
import { ScrollLineChart } from '../charts/ScrollLineChart.tsx'

interface TodoStatsProps {
  selectedDate: DateKey
  today: DateKey
}

/** Done-per-day chart, and the selected day against the day before and the 5 days before. */
export function TodoStats({ selectedDate, today }: TodoStatsProps) {
  const { todos } = useTodos()
  const series = useMemo(() => doneSeries(todos, today), [todos, today])
  const { done, total, previousDay, average5 } = todoComparison(
    todos,
    selectedDate,
  )
  const isToday = selectedDate === today

  return (
    <div className="todo-stats">
      <ScrollLineChart
        points={series.points}
        start={series.start}
        end={today}
        label="Todos done per day"
        format={(value) => `${Math.round(value)} done`}
        selectedDate={selectedDate}
        fromZero
        seed={131}
      />
      <ul className="stats">
        <li>
          {isToday ? 'Today' : 'This day'}: <strong>{done}</strong> of {total}{' '}
          done
        </li>
        <li>
          vs {isToday ? 'yesterday' : 'the day before'} ({previousDay}):{' '}
          <strong>{formatDelta(done - previousDay, 0)}</strong>
        </li>
        <li>
          vs last 5 days (avg {average5.toFixed(1)}/day):{' '}
          <strong>{formatDelta(done - average5)}</strong>
        </li>
      </ul>
    </div>
  )
}
