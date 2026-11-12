import { BarChart3 } from 'lucide-react'
import { useState } from 'react'
import {
  addDays,
  formatDayShort,
  parseDateKey,
  type DateKey,
} from '../../../../lib/date.ts'
import { AreaChart } from '../../charts/AreaChart.tsx'
import { BarChart } from '../../charts/BarChart.tsx'
import { Card } from '../../components/Card.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { average, daySeries } from '../../lib/stats.ts'

type Range = '7' | '30' | '90' | '365'

const RANGES = [
  { value: '7', label: '7D' },
  { value: '30', label: '30D' },
  { value: '90', label: '90D' },
  { value: '365', label: '1Y' },
] as const

interface DoneChartCardProps {
  doneByDay: Map<DateKey, number>
  today: DateKey
  selected: DateKey
  onSelect: (date: DateKey) => void
}

/** Tasks done per day: bars for short ranges, a smooth area for long ones. */
export function DoneChartCard({
  doneByDay,
  today,
  selected,
  onSelect,
}: DoneChartCardProps) {
  const [range, setRange] = useState<Range>('30')
  const days = Number(range)
  const from = addDays(today, -(days - 1))
  const series = daySeries(doneByDay, from, today)
  const total = series.reduce((s, p) => s + p.value, 0)
  const avg = average(series.map((p) => p.value)) ?? 0
  const best = series.reduce((b, p) => (p.value > b.value ? p : b), series[0])
  const format = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))

  return (
    <Card
      icon={<BarChart3 size={16} />}
      title="Done per day"
      subtitle={`${total} done · ${avg.toFixed(1)} a day on average${best?.value ? ` · best ${best.value} on ${formatDayShort(best.date)}` : ''}`}
      action={
        <Segmented
          label="Chart range"
          size="sm"
          options={RANGES}
          value={range}
          onChange={setRange}
        />
      }
    >
      {days <= 30 ? (
        <BarChart
          key={range}
          label={`Tasks done per day, last ${days} days`}
          bars={series.map((p) => {
            const d = parseDateKey(p.date)
            return {
              key: p.date,
              label:
                days === 7
                  ? d.toLocaleDateString('en-GB', { weekday: 'short' })
                  : String(d.getDate()),
              title: formatDayShort(p.date),
              value: p.value,
              highlight: p.date === selected,
            }
          })}
          format={format}
          reference={{ value: avg, label: `avg ${avg.toFixed(1)}` }}
          onSelect={onSelect}
          height={220}
        />
      ) : (
        <AreaChart
          key={range}
          label={`Tasks done per day, last ${days} days`}
          points={series}
          from={from}
          to={today}
          format={format}
          fromZero
          marked={selected}
          height={220}
        />
      )}
    </Card>
  )
}
