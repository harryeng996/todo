import { CalendarCheck, Plus, Scale, TrendingDown } from 'lucide-react'
import { useState } from 'react'
import { addDays, formatLongDate, type DateKey } from '../../../../lib/date.ts'
import {
  toUnit,
  weightComparison,
  type WeightUnit,
} from '../../../../lib/weight.ts'
import { useToday } from '../../../../state/useToday.ts'
import { useWeights } from '../../../../state/useWeights.ts'
import { AnimatedNumber } from '../../components/AnimatedNumber.tsx'
import { Button } from '../../components/Button.tsx'
import { ScreenBody, ScreenHeader } from '../../components/Card.tsx'
import { ProgressRing } from '../../components/ProgressRing.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { StatTile } from '../../components/StatTile.tsx'
import type { DayValue } from '../../lib/stats.ts'
import { useAppSettings } from '../../state/appContext.ts'
import { GoalCard } from './GoalCard.tsx'
import { PhotoGallery } from './PhotoGallery.tsx'
import { TrendCard } from './TrendCard.tsx'
import { WeightLog } from './WeightLog.tsx'
import { WeightSheet } from './WeightSheet.tsx'

const one = (v: number) => v.toFixed(1)

export function BodyScreen() {
  const today = useToday()
  const { log } = useWeights()
  const { settings, update } = useAppSettings()
  const unit = settings.weightUnit
  const [sheetDate, setSheetDate] = useState<DateKey | null>(null)

  const kgPoints: DayValue[] = Object.entries(log)
    .filter(([, e]) => e.kg !== null)
    .map(([date, e]) => ({ date, value: e.kg! }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))
  const points = kgPoints.map((p) => ({
    date: p.date,
    value: toUnit(p.value, unit),
  }))
  const cmp = weightComparison(log, today)
  const loggedToday = log[today]?.kg != null
  const monthAgo = kgPoints.filter((p) => p.date <= addDays(today, -30)).at(-1)
  const days30 = new Set(
    kgPoints.filter((p) => p.date > addDays(today, -30)).map((p) => p.date),
  ).size

  return (
    <ScreenBody>
      <ScreenHeader
        eyebrow={formatLongDate(today)}
        title="Body"
        subtitle={
          loggedToday
            ? 'Logged for today. Nice and consistent.'
            : 'No weigh-in yet today.'
        }
        actions={
          <>
            <Segmented<WeightUnit>
              label="Weight unit"
              size="sm"
              value={unit}
              onChange={(weightUnit) => update({ weightUnit })}
              options={[
                { value: 'kg', label: 'kg' },
                { value: 'lb', label: 'lb' },
              ]}
            />
            <Button
              variant="primary"
              icon={<Plus size={17} />}
              onClick={() => setSheetDate(today)}
            >
              {loggedToday ? 'Edit today' : 'Log weight'}
            </Button>
          </>
        }
      />

      <div className="body-layout">
        <TrendCard points={points} today={today} unit={unit} />
        <div className="body-layout__side">
          <GoalCard kgPoints={kgPoints} today={today} unit={unit} />
          <div className="insights">
            <StatTile
              label="vs 10-day avg"
              icon={<Scale size={16} />}
              tone="var(--body)"
              value={
                cmp.current && cmp.average10 !== null ? (
                  <AnimatedNumber
                    value={toUnit(cmp.current.kg - cmp.average10, unit)}
                    format={(v) => `${v > 0 ? '+' : ''}${one(v)}`}
                  />
                ) : (
                  '—'
                )
              }
              unit={cmp.average10 !== null ? unit : undefined}
              footer={
                <span className="stat__caption">
                  {cmp.average10 !== null
                    ? `Average ${one(toUnit(cmp.average10, unit))} ${unit}`
                    : 'Needs earlier weigh-ins'}
                </span>
              }
            />
            <StatTile
              label="30-day change"
              icon={<TrendingDown size={16} />}
              tone="var(--accent)"
              value={
                cmp.current && monthAgo ? (
                  <AnimatedNumber
                    value={toUnit(cmp.current.kg - monthAgo.value, unit)}
                    format={(v) => `${v > 0 ? '+' : ''}${one(v)}`}
                  />
                ) : (
                  '—'
                )
              }
              unit={monthAgo ? unit : undefined}
              footer={
                <span className="stat__caption">
                  {monthAgo
                    ? `From ${one(toUnit(monthAgo.value, unit))} ${unit}`
                    : 'Needs a month of data'}
                </span>
              }
            />
            <StatTile
              label="Consistency · 30d"
              icon={<CalendarCheck size={16} />}
              tone="var(--warn)"
              value={<AnimatedNumber value={days30} />}
              unit="/ 30 days"
              aside={
                <ProgressRing
                  value={days30 / 30}
                  size={46}
                  stroke={5}
                  color="var(--warn)"
                />
              }
              footer={
                <span className="stat__caption">
                  {kgPoints.length} weigh-ins in total
                </span>
              }
              className="insights__wide"
            />
          </div>
        </div>
      </div>

      <PhotoGallery today={today} unit={unit} />
      <WeightLog unit={unit} onEdit={setSheetDate} />

      <WeightSheet
        open={sheetDate !== null}
        date={sheetDate ?? today}
        today={today}
        unit={unit}
        onClose={() => setSheetDate(null)}
      />
    </ScreenBody>
  )
}
