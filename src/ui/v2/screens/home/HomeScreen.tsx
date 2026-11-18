import { ArrowRight, CircleCheckBig, Flame, Scale, Timer } from 'lucide-react'
import { useMemo } from 'react'
import { doneCountsByDay } from '../../../../hooks/gridLevels.ts'
import {
  addDays,
  dayOfWeek,
  daysBetween,
  formatLongDate,
  formatRange,
} from '../../../../lib/date.ts'
import { toUnit, weightComparison } from '../../../../lib/weight.ts'
import { formatMinutes } from '../../../../state/pomodoro.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { useTodos } from '../../../../state/useTodos.ts'
import { useToday } from '../../../../state/useToday.ts'
import { useWeights } from '../../../../state/useWeights.ts'
import { AnimatedNumber } from '../../components/AnimatedNumber.tsx'
import { Button } from '../../components/Button.tsx'
import { Card, ScreenBody, ScreenHeader } from '../../components/Card.tsx'
import { useConfetti } from '../../components/confettiContext.ts'
import { ProgressRing } from '../../components/ProgressRing.tsx'
import { Delta, StatTile } from '../../components/StatTile.tsx'
import { TaskComposer } from '../../components/tasks/TaskComposer.tsx'
import { TaskList } from '../../components/tasks/TaskList.tsx'
import { Heatmap } from '../../charts/Heatmap.tsx'
import { Sparkline } from '../../charts/Sparkline.tsx'
import { useWidth } from '../../charts/useWidth.ts'
import { navigate } from '../../lib/router.ts'
import { useNow } from '../../lib/useNow.ts'
import {
  daySeries,
  focusMinutesByDay,
  greeting,
  streakOf,
  sumDays,
} from '../../lib/stats.ts'
import { useAppSettings } from '../../state/appContext.ts'
import { ClockFace } from './ClockFace.tsx'
import { FocusSummaryCard } from './FocusSummaryCard.tsx'
import { QuoteSpotlight } from './QuoteSpotlight.tsx'
import { TargetsCard } from './TargetsCard.tsx'

export function HomeScreen() {
  const today = useToday()
  const { todos } = useTodos()
  const { sessions } = usePomodoro()
  const { log } = useWeights()
  const { settings } = useAppSettings()
  const confetti = useConfetti()
  const yesterday = addDays(today, -1)
  const hour = useNow(60_000).getHours()

  const doneByDay = useMemo(() => doneCountsByDay(todos), [todos])
  const focusByDay = useMemo(() => focusMinutesByDay(sessions), [sessions])
  const todays = todos.filter((t) => t.date === today)
  const doneToday = todays.filter((t) => t.done).length
  const streak = streakOf(doneByDay, today)
  const focusToday = focusByDay.get(today) ?? 0
  const sessionsToday = sessions.filter((s) => s.date === today).length
  const focusWeek = daySeries(focusByDay, addDays(today, -6), today).map(
    (d) => d.value,
  )
  const weight = weightComparison(log, today)
  const weightSeries = Object.entries(log)
    .filter(([d, e]) => e.kg !== null && d >= addDays(today, -29) && d <= today)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([, e]) => toUnit(e.kg!, settings.weightUnit))
  const doneWeek = sumDays(doneByDay, today, 7)
  const doneLastWeek = sumDays(doneByDay, addDays(today, -7), 7)

  // As many weeks as fit the card (15px cells + 3px gaps, after the weekday labels).
  const [heatRef, heatWidth] = useWidth<HTMLDivElement>(800)
  const weeks = Math.min(Math.max(Math.floor((heatWidth - 36) / 18), 8), 53)
  // A full year that still leaves room gets bigger cells.
  const heatCell = Math.min(
    Math.max(Math.floor((heatWidth - 36) / weeks) - 3, 12),
    22,
  )
  const heatFrom = addDays(today, -(7 * (weeks - 1)) - dayOfWeek(today))
  const doneInRange = sumDays(
    doneByDay,
    today,
    daysBetween(heatFrom, today) + 1,
  )

  return (
    <ScreenBody>
      <ScreenHeader
        eyebrow={formatLongDate(today)}
        title={`${greeting(hour)} 👋`}
        subtitle={
          todays.length === 0
            ? 'A clean slate. What will you get done today?'
            : doneToday === todays.length
              ? 'Everything on today’s list is done. Nice work.'
              : `${todays.length - doneToday} of ${todays.length} tasks left for today.`
        }
        actions={<ClockFace />}
      />

      <div className="stat-grid">
        <StatTile
          label="Today’s tasks"
          icon={<CircleCheckBig size={16} />}
          value={<AnimatedNumber value={doneToday} />}
          unit={`/ ${todays.length}`}
          footer={
            <Delta
              change={doneToday - (doneByDay.get(yesterday) ?? 0)}
              good="up"
              suffix="vs yesterday"
            />
          }
          aside={
            <ProgressRing
              value={todays.length ? doneToday / todays.length : 0}
              size={56}
              stroke={6}
            >
              <span className="num ring__pct">
                {todays.length
                  ? Math.round((doneToday / todays.length) * 100)
                  : 0}
                %
              </span>
            </ProgressRing>
          }
          onClick={() => navigate('tasks')}
        />
        {settings.pomodoro ? (
          <StatTile
            label="Focus today"
            icon={<Timer size={16} />}
            tone="var(--focus)"
            value={
              <AnimatedNumber
                value={focusToday}
                format={(v) => formatMinutes(v)}
              />
            }
            footer={
              <span className="stat__caption">
                {sessionsToday} {sessionsToday === 1 ? 'session' : 'sessions'} ·{' '}
                <Delta
                  change={focusToday - (focusByDay.get(yesterday) ?? 0)}
                  format={(v) => formatMinutes(v)}
                  suffix="vs yesterday"
                />
              </span>
            }
            aside={<Sparkline values={focusWeek} color="var(--focus)" />}
            onClick={() => navigate('focus')}
          />
        ) : (
          <StatTile
            label="Done this week"
            icon={<CircleCheckBig size={16} />}
            value={<AnimatedNumber value={doneWeek} />}
            footer={
              <Delta change={doneWeek - doneLastWeek} suffix="vs last week" />
            }
            aside={
              <Sparkline
                values={daySeries(doneByDay, addDays(today, -6), today).map(
                  (d) => d.value,
                )}
              />
            }
          />
        )}
        <StatTile
          label="Streak"
          icon={<Flame size={16} />}
          tone="var(--warn)"
          value={<AnimatedNumber value={streak.current} />}
          unit={streak.current === 1 ? 'day' : 'days'}
          footer={
            <span className="stat__caption">
              {streak.activeToday || streak.current === 0
                ? `Best ${streak.best} ${streak.best === 1 ? 'day' : 'days'}`
                : 'Finish a task today to keep it'}
            </span>
          }
          aside={<FlameBadge active={streak.activeToday} />}
        />
        {settings.weightTracking ? (
          <StatTile
            label="Weight"
            icon={<Scale size={16} />}
            tone="var(--body)"
            value={
              weight.current ? (
                <AnimatedNumber
                  value={toUnit(weight.current.kg, settings.weightUnit)}
                  format={(v) => v.toFixed(1)}
                />
              ) : (
                '—'
              )
            }
            unit={weight.current ? settings.weightUnit : undefined}
            footer={
              <Delta
                change={
                  weight.current && weight.previous
                    ? toUnit(
                        weight.current.kg - weight.previous.kg,
                        settings.weightUnit,
                      )
                    : null
                }
                format={(v) => v.toFixed(1)}
                good="none"
                suffix="vs last"
              />
            }
            aside={
              <Sparkline
                values={weightSeries}
                color="var(--body)"
                fromZero={false}
              />
            }
            onClick={() => navigate('body')}
          />
        ) : (
          <StatTile
            label="Done this week"
            icon={<CircleCheckBig size={16} />}
            value={<AnimatedNumber value={doneWeek} />}
            footer={
              <Delta change={doneWeek - doneLastWeek} suffix="vs last week" />
            }
            aside={
              <Sparkline
                values={daySeries(doneByDay, addDays(today, -6), today).map(
                  (d) => d.value,
                )}
              />
            }
          />
        )}
      </div>

      <div className="home-grid">
        <Card
          className="home-tasks"
          title="Today"
          subtitle={`${doneToday} of ${todays.length} done`}
          action={
            <Button variant="ghost" size="sm" onClick={() => navigate('tasks')}>
              All tasks <ArrowRight size={15} />
            </Button>
          }
        >
          <TaskComposer date={today} />
          <TaskList
            todos={todays}
            empty="No tasks yet. Add your first one above."
            limit={6}
            showCompleted={false}
            onCompleted={(left) => left === 0 && confetti()}
          />
        </Card>
        {settings.pomodoro ? <FocusSummaryCard /> : <QuoteSpotlight />}
        <TargetsCard />
        {settings.pomodoro && <QuoteSpotlight />}
      </div>

      <Card
        title="Activity"
        subtitle={`${doneInRange} tasks done · ${formatRange(heatFrom, today)}`}
        action={
          <Button variant="ghost" size="sm" onClick={() => navigate('tasks')}>
            Insights <ArrowRight size={15} />
          </Button>
        }
      >
        <div ref={heatRef}>
          <Heatmap
            from={heatFrom}
            to={today}
            today={today}
            counts={doneByDay}
            describe={(n) => `${n} ${n === 1 ? 'task' : 'tasks'} done`}
            onSelect={(date) => navigate('tasks', date)}
            cell={heatCell}
          />
        </div>
      </Card>
    </ScreenBody>
  )
}

function FlameBadge({ active }: { active: boolean }) {
  return (
    <span className={`flame ${active ? 'is-active' : ''}`} aria-hidden="true">
      <Flame size={26} strokeWidth={1.75} />
      {active && (
        <>
          <i className="flame__spark" />
          <i className="flame__spark" />
          <i className="flame__spark" />
        </>
      )}
    </span>
  )
}
