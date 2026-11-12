import { CheckCheck, Flame, Flag, Scale, Timer } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import { parseDateKey } from '../../../lib/date.ts'
import {
  formatCountdown,
  phaseLabel,
  phaseMs,
  remainingMs,
} from '../../../state/pomodoro.ts'
import type { SaverLayout } from '../../../state/useSettings.ts'
import { usePomodoro } from '../../../state/usePomodoro.ts'
import { FlipText } from '../components/FlipText.tsx'
import { useNow } from '../lib/useNow.ts'
import { useAppSettings } from '../state/appContext.ts'
import { MiniBars, MiniDots, MiniLine, MiniRing } from './miniCharts.tsx'
import { hm, type SaverData } from './saverData.ts'
import type { Palette } from './themes.ts'

interface SaverSceneProps {
  data: SaverData
  palette: Palette
  layout: SaverLayout
  widgets: boolean
  seconds: boolean
}

const pad = (n: number) => String(n).padStart(2, '0')

/**
 * The screensaver picture: a slowly moving aura of colour with film grain,
 * a large clock, and a few glass widgets with today's numbers. Sized in
 * container units, so the full-screen view and the Settings preview match.
 */
export function SaverScene({
  data,
  palette,
  layout,
  widgets,
  seconds,
}: SaverSceneProps) {
  const now = useNow(1000)
  const style = {
    '--base': palette.base,
    '--g1': palette.glow[0],
    '--g2': palette.glow[1],
    '--g3': palette.glow[2],
    '--g4': palette.glow[3],
    '--ink': palette.ink,
    '--glass': palette.glass,
  } as CSSProperties
  const date = parseDateKey(data.today).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })
  const { tasks, focus } = data
  const summary = [
    tasks.today
      ? `${tasks.doneToday} of ${tasks.today} tasks done`
      : 'No tasks planned yet',
    focus.enabled && focus.minutesToday > 0
      ? `${hm(focus.minutesToday)} focused`
      : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={`scene scene--${layout} ${palette.night ? 'scene--night' : ''}`}
      style={style}
    >
      <div className="scene__aura" aria-hidden="true">
        <span />
        <span />
        <span />
        <span />
      </div>
      <div className="scene__grain" aria-hidden="true" />
      <div className="scene__vignette" aria-hidden="true" />

      <div className="scene__content">
        <div className="scene__clock">
          <p className="scene__date">{date}</p>
          <time
            className="scene__time"
            dateTime={now.toISOString()}
            aria-label={`${pad(now.getHours())}:${pad(now.getMinutes())}`}
          >
            <FlipText
              value={`${pad(now.getHours())}:${pad(now.getMinutes())}`}
            />
            {seconds && (
              <span className="scene__sec">
                <FlipText value={pad(now.getSeconds())} />
              </span>
            )}
          </time>
          {layout !== 'minimal' && <p className="scene__summary">{summary}</p>}
        </div>

        {widgets && layout !== 'minimal' && (
          <div className="scene__widgets">
            <Widgets data={data} />
          </div>
        )}
      </div>

      {layout !== 'minimal' && data.quote && (
        <AnimatePresence mode="wait">
          <motion.p
            key={data.quote.text}
            className="scene__quote"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2 }}
          >
            “{data.quote.text}” <span>— {data.quote.author}</span>
          </motion.p>
        </AnimatePresence>
      )}
    </div>
  )
}

function Widget({
  icon,
  label,
  className = '',
  children,
}: {
  icon: ReactNode
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={`widget ${className}`}>
      <p className="widget__label">
        {icon}
        {label}
      </p>
      {children}
    </div>
  )
}

/** Up to four widgets, most useful first. */
function Widgets({ data }: { data: SaverData }) {
  const { settings } = useAppSettings()
  const { tasks, focus, weight, target } = data
  const list: ReactNode[] = []

  list.push(
    <Widget key="tasks" icon={<CheckCheck />} label="Today">
      <div className="widget__row">
        <MiniRing value={tasks.today ? tasks.doneToday / tasks.today : 0}>
          {tasks.today ? Math.round((tasks.doneToday / tasks.today) * 100) : 0}%
        </MiniRing>
        <div>
          <p className="widget__value">
            {tasks.doneToday}
            <small>/{tasks.today}</small>
          </p>
          <p className="widget__sub">tasks done</p>
        </div>
      </div>
    </Widget>,
  )
  if (settings.pomodoro) list.push(<FocusWidget key="focus" data={data} />)
  list.push(
    <Widget key="streak" icon={<Flame />} label="Streak">
      <p className="widget__value">
        {tasks.streak}
        <small> {tasks.streak === 1 ? 'day' : 'days'}</small>
      </p>
      <div className="widget__chart widget__chart--dots">
        <MiniDots byDay={tasks.byDay} today={data.today} weeks={12} />
      </div>
    </Widget>,
  )
  if (weight)
    list.push(
      <Widget key="weight" icon={<Scale />} label="Weight">
        <p className="widget__value">
          {weight.current.toFixed(1)}
          <small> {weight.unit}</small>
        </p>
        <p className="widget__sub">
          {weight.change30 === null
            ? 'last weigh-in'
            : `${weight.change30 > 0 ? '+' : weight.change30 < 0 ? '−' : '±'}${Math.abs(weight.change30).toFixed(1)} in 30 days`}
        </p>
        <div className="widget__chart">
          <MiniLine values={weight.series} />
        </div>
      </Widget>,
    )
  else if (target && target.daysLeft > 0)
    list.push(
      <Widget key="target" icon={<Flag />} label="Target">
        <p className="widget__value">
          {target.daysLeft}
          <small> {target.daysLeft === 1 ? 'day' : 'days'}</small>
        </p>
        <p className="widget__sub widget__sub--clip">{target.title}</p>
        <div className="widget__bar">
          <span style={{ transform: `scaleX(${target.progress})` }} />
        </div>
      </Widget>,
    )
  else if (!focus.enabled)
    list.push(
      <Widget key="week" icon={<CheckCheck />} label="This week">
        <p className="widget__value">{tasks.done7}</p>
        <div className="widget__chart">
          <MiniBars values={tasks.series7} />
        </div>
      </Widget>,
    )
  return <>{list.slice(0, 4)}</>
}

/** Focus minutes this week, or a live countdown while the timer runs. */
function FocusWidget({ data }: { data: SaverData }) {
  const { timer, config } = usePomodoro()
  const running = timer.status === 'running'
  const now = useNow(1000, running)
  if (timer.status !== 'idle') {
    const total = phaseMs(timer.phase, config)
    const left = Math.min(remainingMs(timer, now.getTime()), total)
    return (
      <Widget
        icon={<span className={`widget__live ${running ? 'is-on' : ''}`} />}
        label={running ? phaseLabel(timer.phase) : 'Paused'}
        className="widget--live"
      >
        <p className="widget__value widget__value--timer">
          {formatCountdown(left)}
        </p>
        <p className="widget__sub widget__sub--clip">
          {timer.taskTitle ?? 'No particular task'}
        </p>
        <div className="widget__bar">
          <span style={{ transform: `scaleX(${1 - left / total})` }} />
        </div>
      </Widget>
    )
  }
  return (
    <Widget icon={<Timer />} label="Focus">
      <p className="widget__value">
        {hm(data.focus.minutesToday)}
        <small> today</small>
      </p>
      <div className="widget__chart">
        <MiniBars values={data.focus.series7} />
      </div>
    </Widget>
  )
}
