import type { ReactNode } from 'react'
import { addDays, parseDateKey } from '../../../lib/date.ts'
import {
  MiniBars,
  MiniHeatmap,
  MiniLine,
  MiniRing,
  RoughBars,
  RoughMug,
  RoughStripes,
} from './miniCharts.tsx'
import { definitions, hm, SAYINGS, type PosterData } from './posterData.ts'

export interface PosterProps {
  data: PosterData
  /** How many times this style has been shown; varies the content. */
  round: number
}

const weekdayLetters = (data: PosterData) =>
  Array.from({ length: 7 }, (_, i) =>
    parseDateKey(addDays(data.today, i - 6)).toLocaleDateString('en-GB', {
      weekday: 'narrow',
    }),
  )

const longDate = (data: PosterData) =>
  parseDateKey(data.today).toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  })

/* ---------- 1. Statement: bold serif words, today's numbers ---------- */

export function StatementPoster({ data }: PosterProps) {
  const { tasks, focus } = data
  return (
    <div className="poster poster--statement">
      <div className="ps__block">
        <p className="ps__line">
          Plan.
          <sup>
            {tasks.today} {tasks.today === 1 ? 'task' : 'tasks'}
          </sup>
        </p>
        {focus.enabled ? (
          <p className="ps__line">
            Focus.<sup>{hm(focus.minutesToday)}</sup>
          </p>
        ) : (
          <p className="ps__line">
            Do.<sup>one at a time</sup>
          </p>
        )}
        <p className="ps__line">
          Done.
          <sup>
            {tasks.doneToday} of {tasks.today}
          </sup>
        </p>
      </div>
      <div className="ps__foot">
        <MiniLine
          values={tasks.series14}
          color="#1b1a18"
          fill
          strokeWidth={0.8}
          height={22}
        />
        <div className="ps__caption">
          <span>Tasks done · last 14 days</span>
          <span>{longDate(data)}</span>
        </div>
      </div>
    </div>
  )
}

/* ---------- 2. Definition: a dictionary entry written from the data ---------- */

const GREYS = ['#e9e7e1', '#c9c6be', '#a3a097', '#6f6c64', '#2a2926']

export function DefinitionPoster({ data, round }: PosterProps) {
  const list = definitions(data)
  const entry = list[round % list.length]
  let chart: ReactNode
  let caption = ''
  if (entry.chart === 'heatmap') {
    chart = (
      <MiniHeatmap
        byDay={data.tasks.byDay}
        today={data.today}
        weeks={18}
        levels={GREYS}
      />
    )
    caption = 'tasks done · last 18 weeks'
  } else if (entry.chart === 'focus') {
    chart = (
      <MiniBars
        values={data.focus.series7}
        color="#8f8b82"
        accent="#1b1b1b"
        highlight={6}
        labels={weekdayLetters(data)}
        labelColor="#6b6860"
        font="'Libre Caslon Text', serif"
        height={24}
        radius={0.8}
      />
    )
    caption = 'focus minutes · last 7 days'
  } else if (entry.chart === 'weight' && data.weight) {
    chart = (
      <MiniLine
        values={data.weight.series}
        color="#1b1b1b"
        fromZero={false}
        height={26}
        strokeWidth={0.8}
      />
    )
    caption = `weight (${data.weight.unit}) · last 60 days`
  } else {
    chart = (
      <MiniBars
        values={data.tasks.series14}
        color="#8f8b82"
        accent="#1b1b1b"
        highlight={13}
        height={24}
        radius={0.8}
      />
    )
    caption = 'tasks done · last 14 days'
  }
  return (
    <div className="poster poster--definition">
      <div className="pd__body">
        <h2 className="pd__word">{entry.word}</h2>
        <p className="pd__meta">
          [{entry.phonetic}] <i>{entry.kind}</i>
        </p>
        <hr />
        <p className="pd__text">{entry.text}</p>
        <div className="pd__chart">{chart}</div>
        <p className="pd__caption">{caption}</p>
      </div>
    </div>
  )
}

/* ---------- 3. Retro: a vintage print ad for your week ---------- */

function isoWeek(date: Date): number {
  const d = new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()),
  )
  const day = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - day)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7)
}

export function RetroPoster({ data }: PosterProps) {
  const { tasks, focus } = data
  const useFocus = focus.enabled && focus.minutes7 > 0
  const series = useFocus ? focus.series7 : tasks.series7
  const big = useFocus ? hm(focus.minutes7) : String(tasks.done7)
  const date = parseDateKey(data.today)
  const bestIndex = series.indexOf(Math.max(...series))
  const bestDay = parseDateKey(
    addDays(data.today, bestIndex - 6),
  ).toLocaleDateString('en-GB', {
    weekday: 'long',
  })
  return (
    <div className="poster poster--retro">
      <header className="pr__head">
        <h2>
          <span className="pr__q">“</span>
          {useFocus ? 'Deep Work' : 'Get it Done'}
          <span className="pr__q">”</span>
        </h2>
        <p className="pr__ribbon">
          {useFocus
            ? 'Seven days of focus, measured in minutes'
            : 'Seven days of finished tasks'}
        </p>
      </header>
      <div className="pr__hero">
        <div className="pr__record">
          <div className="pr__label">
            <strong>{big}</strong>
            <small>{useFocus ? 'focused' : 'done'}</small>
          </div>
        </div>
        <div className="pr__bars">
          <MiniBars
            values={series}
            color="#1c1a17"
            accent="#c8322b"
            highlight={6}
            labels={weekdayLetters(data)}
            labelColor="#1c1a17"
            font="'Oswald Variable', sans-serif"
            radius={0.5}
            height={70}
          />
        </div>
      </div>
      <p className="pr__tagline">
        {useFocus
          ? 'Drop the needle. Start the timer. Let the world wait.'
          : 'Pick one thing. Finish it. Then the next.'}
      </p>
      <div className="pr__bottom">
        <ul className="pr__notes">
          <li>
            Today: {tasks.doneToday} of {tasks.today} tasks done.
          </li>
          <li>
            Streak: {tasks.streak} {tasks.streak === 1 ? 'day' : 'days'} in a
            row.
          </li>
          {Math.max(...series) > 0 && <li>Best day this week: {bestDay}.</li>}
          {focus.enabled && <li>Sessions today: {focus.sessionsToday}.</li>}
          {data.target && data.target.daysLeft > 0 && (
            <li>
              {data.target.daysLeft} days to “{data.target.title}”.
            </li>
          )}
        </ul>
        <div className="pr__stamp">
          <small>Week {isoWeek(date)}</small>
          <strong>
            {date.getDate()}{' '}
            {date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
          </strong>
          <small>Plan · Focus · Done</small>
        </div>
      </div>
    </div>
  )
}

/* ---------- 4. Sketch: hand-lettered doodle with a drawn chart ---------- */

export function SketchPoster({ data, round }: PosterProps) {
  const lines = SAYINGS[round % SAYINGS.length]
  return (
    <div className="poster poster--sketch">
      <h2 className="pk__text">
        {lines.map((l) => (
          <span key={l}>{l}</span>
        ))}
      </h2>
      <div className="pk__scene">
        <div className="pk__mug">
          <RoughMug ink="#171615" accent="#d13b2f" />
        </div>
        <div className="pk__chart">
          <RoughBars
            values={data.tasks.series7}
            labels={weekdayLetters(data)}
            ink="#171615"
            fill="#d13b2f"
            font="'Patrick Hand', cursive"
          />
          <p>
            {data.tasks.doneToday} done today · {data.tasks.done7} this week
          </p>
        </div>
      </div>
      <div className="pk__stripes">
        <RoughStripes color="#d13b2f" />
      </div>
    </div>
  )
}

/* ---------- 5. Quote: the current quote on coloured paper ---------- */

const PAPERS = ['#cfd6c4', '#e6c9bd', '#ddd3bf', '#c9d3db']

export function QuotePoster({ data, round }: PosterProps) {
  const quote = data.quote ?? {
    text: 'Today is a good day to start.',
    author: 'Your to-do list',
  }
  const { tasks } = data
  const size =
    quote.text.length > 140
      ? 'is-long'
      : quote.text.length > 70
        ? 'is-medium'
        : ''
  return (
    <div
      className="poster poster--quote"
      style={{ ['--paper' as string]: PAPERS[round % PAPERS.length] }}
    >
      <span className="pq__mark" aria-hidden="true">
        “
      </span>
      <blockquote className={size}>{quote.text}</blockquote>
      <p className="pq__author">— {quote.author}</p>
      <div className="pq__foot">
        <div className="pq__ring">
          <MiniRing
            value={tasks.today ? tasks.doneToday / tasks.today : 0}
            color="#1d1c1a"
            track="rgb(0 0 0 / 0.1)"
          />
        </div>
        <span>
          {tasks.doneToday} of {tasks.today} done today
          <br />
          {longDate(data)}
        </span>
      </div>
    </div>
  )
}
