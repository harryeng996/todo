import { CalendarDays } from 'lucide-react'
import type { DateKey } from '../../../../lib/date.ts'
import { BarChart } from '../../charts/BarChart.tsx'
import { Card } from '../../components/Card.tsx'
import { weekdayAverages } from '../../lib/stats.ts'

const NAMES = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
]
const WEEKS = 8

export function WeekdayCard({
  doneByDay,
  today,
}: {
  doneByDay: Map<DateKey, number>
  today: DateKey
}) {
  const averages = weekdayAverages(doneByDay, today, WEEKS)
  const best = averages.reduce(
    (b, d) => (d.value > b.value ? d : b),
    averages[0],
  )
  const any = best.value > 0

  return (
    <Card
      icon={<CalendarDays size={16} />}
      title="By weekday"
      subtitle={
        any
          ? `Most done on ${NAMES[best.weekday]}s · last ${WEEKS} weeks`
          : `Average per weekday · last ${WEEKS} weeks`
      }
    >
      <BarChart
        label={`Average tasks done per weekday over the last ${WEEKS} weeks`}
        bars={averages.map((d) => ({
          key: d.label,
          label: d.label,
          title: `${NAMES[d.weekday]} average`,
          value: d.value,
          highlight: any && d.weekday === best.weekday,
        }))}
        format={(v) => v.toFixed(1)}
        color="var(--break)"
        height={180}
      />
    </Card>
  )
}
