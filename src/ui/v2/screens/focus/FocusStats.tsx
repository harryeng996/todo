import {
  BarChart3,
  Clock3,
  Flame,
  Hash,
  ListChecks,
  Sunrise,
  Trophy,
} from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { formatDayShort, parseDateKey } from '../../../../lib/date.ts'
import {
  filterSessions,
  formatMinutes,
  NO_TASK,
  RANGE_LABELS,
  rangeStart,
  summarize,
  taskTitles,
  type StatsRange,
} from '../../../../state/pomodoro.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { useToday } from '../../../../state/useToday.ts'
import { AreaChart } from '../../charts/AreaChart.tsx'
import { BarChart } from '../../charts/BarChart.tsx'
import { AnimatedNumber } from '../../components/AnimatedNumber.tsx'
import { Card } from '../../components/Card.tsx'
import { Segmented } from '../../components/Segmented.tsx'
import { StatTile } from '../../components/StatTile.tsx'
import { riseIn } from '../../lib/motion.ts'
import {
  focusCountByDay,
  minutesByHour,
  minutesByTask,
  streakOf,
} from '../../lib/stats.ts'

const RANGES = (Object.keys(RANGE_LABELS) as StatsRange[]).map((value) => ({
  value,
  label: { today: 'Today', '7d': '7D', '30d': '30D', all: 'All' }[value],
  title: RANGE_LABELS[value],
}))

/** Focus statistics, filtered by range and task (v1's dialog, now on the screen). */
export function FocusStats() {
  const today = useToday()
  const { sessions } = usePomodoro()
  const [range, setRange] = useState<StatsRange>('7d')
  const [task, setTask] = useState('')

  const from = rangeStart(range, today, sessions)
  const shown = filterSessions(sessions, { range, task }, today)
  const summary = summarize(shown, from, today)
  const streak = streakOf(focusCountByDay(sessions), today)
  const best = summary.perDay.reduce((b, p) => (p.value > b.value ? p : b), {
    date: today,
    value: 0,
  })
  const byTask = minutesByTask(shown).slice(0, 6)
  const byHour = minutesByHour(shown)
  const peak = byHour.indexOf(Math.max(...byHour))
  const tasks = taskTitles(sessions)
  const days = summary.perDay.length

  return (
    <>
      <motion.div className="section-head" variants={riseIn}>
        <div>
          <h2>Statistics</h2>
          <p className="muted">
            {RANGE_LABELS[range]}
            {task ? ` · ${task === NO_TASK ? 'No task' : task}` : ''}
          </p>
        </div>
        <div className="section-head__filters">
          <select
            className="select"
            value={task}
            onChange={(e) => setTask(e.target.value)}
            aria-label="Filter by task"
          >
            <option value="">All tasks</option>
            <option value={NO_TASK}>No task</option>
            {tasks.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <Segmented
            label="Statistics range"
            value={range}
            onChange={setRange}
            options={RANGES}
          />
        </div>
      </motion.div>

      <div className="stat-grid">
        <StatTile
          label="Focus time"
          icon={<Clock3 size={16} />}
          tone="var(--focus)"
          value={
            <AnimatedNumber value={summary.minutes} format={formatMinutes} />
          }
          footer={
            <span className="stat__caption">
              {formatMinutes(summary.perDayAverage)} a day on average
            </span>
          }
        />
        <StatTile
          label="Sessions"
          icon={<Hash size={16} />}
          value={<AnimatedNumber value={summary.count} />}
          footer={
            <span className="stat__caption">
              {summary.count
                ? `${formatMinutes(summary.minutes / summary.count)} each`
                : 'None yet'}
            </span>
          }
        />
        <StatTile
          label="Focus streak"
          icon={<Flame size={16} />}
          tone="var(--warn)"
          value={<AnimatedNumber value={streak.current} />}
          unit={streak.current === 1 ? 'day' : 'days'}
          footer={
            <span className="stat__caption">
              Best {streak.best} {streak.best === 1 ? 'day' : 'days'}
            </span>
          }
        />
        <StatTile
          label={range === 'today' ? 'Peak hour' : 'Best day'}
          icon={
            range === 'today' ? <Sunrise size={16} /> : <Trophy size={16} />
          }
          tone="var(--body)"
          value={
            range === 'today'
              ? summary.minutes
                ? `${String(peak).padStart(2, '0')}:00`
                : '—'
              : best.value
                ? formatMinutes(best.value)
                : '—'
          }
          footer={
            <span className="stat__caption">
              {range === 'today'
                ? 'When you focused most'
                : best.value
                  ? formatDayShort(best.date)
                  : 'No sessions yet'}
            </span>
          }
        />
      </div>

      <div className="focus-charts">
        <Card
          icon={<BarChart3 size={16} />}
          title={range === 'today' ? 'Today by hour' : 'Focus per day'}
          subtitle={
            summary.truncated
              ? 'Showing the last year'
              : `${formatMinutes(summary.minutes)} in total`
          }
        >
          {range === 'today' ? (
            <HourChart hours={byHour} />
          ) : days <= 31 ? (
            <BarChart
              key={`${range}${task}`}
              label="Focus minutes per day"
              bars={summary.perDay.map((p) => {
                const d = parseDateKey(p.date)
                return {
                  key: p.date,
                  label:
                    days <= 7
                      ? d.toLocaleDateString('en-GB', { weekday: 'short' })
                      : String(d.getDate()),
                  title: formatDayShort(p.date),
                  value: p.value,
                  highlight: p.date === today,
                }
              })}
              format={(v) => formatMinutes(v)}
              color="var(--focus)"
              reference={{
                value: summary.perDayAverage,
                label: `avg ${formatMinutes(summary.perDayAverage)}`,
              }}
            />
          ) : (
            <AreaChart
              key={`${range}${task}`}
              label="Focus minutes per day"
              points={summary.perDay}
              from={summary.perDay[0]?.date ?? today}
              to={today}
              format={(v) => formatMinutes(v)}
              color="var(--focus)"
              fromZero
            />
          )}
        </Card>

        <Card
          icon={<ListChecks size={16} />}
          title="By task"
          subtitle="Where the time went"
        >
          {byTask.length === 0 ? (
            <p className="empty">No sessions in this range.</p>
          ) : (
            <ul className="shares">
              {byTask.map((t, i) => (
                <li key={t.title} className="share">
                  <div className="share__row">
                    <span className="share__title">{t.title}</span>
                    <span className="share__value num">
                      {formatMinutes(t.minutes)} ·{' '}
                      {Math.round((t.minutes / summary.minutes) * 100)}%
                    </span>
                  </div>
                  <div className="bar">
                    <motion.span
                      className="bar__fill"
                      style={{ background: 'var(--focus)' }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: t.minutes / byTask[0].minutes }}
                      transition={{
                        duration: 0.8,
                        delay: 0.1 + i * 0.05,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {range !== 'today' && (
          <Card
            icon={<Sunrise size={16} />}
            title="When you focus"
            subtitle={
              summary.minutes
                ? `Most often around ${String(peak).padStart(2, '0')}:00`
                : 'Minutes by starting hour'
            }
            className="focus-charts__wide"
          >
            <HourChart hours={byHour} />
          </Card>
        )}
      </div>
    </>
  )
}

function HourChart({ hours }: { hours: number[] }) {
  const peak = Math.max(...hours)
  return (
    <BarChart
      label="Focus minutes by hour of the day"
      bars={hours.map((m, h) => ({
        key: String(h),
        label: h % 3 === 0 ? String(h).padStart(2, '0') : '',
        title: `${String(h).padStart(2, '0')}:00–${String(h + 1).padStart(2, '0')}:00`,
        value: m,
        highlight: m > 0 && m === peak,
      }))}
      format={(v) => formatMinutes(v)}
      color="var(--warn)"
      height={170}
    />
  )
}
