import { CalendarClock, Trash2 } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import { formatMinutes } from '../../../../state/pomodoro.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { useToday } from '../../../../state/useToday.ts'
import { IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { useNow } from '../../lib/useNow.ts'

const clock = (ms: number) =>
  new Date(ms).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
  })

/** Today's focus sessions on a day ruler, plus the list (newest first). */
export function TodayTimeline() {
  const today = useToday()
  const { sessions, deleteSession } = usePomodoro()
  const now = useNow(60_000)
  const [confirming, setConfirming] = useState<string | null>(null)
  const todays = sessions
    .filter((s) => s.date === today)
    .sort((a, b) => b.end - a.end)
  const minutes = todays.reduce((sum, s) => sum + s.minutes, 0)

  // The ruler spans 06:00–24:00, stretched to include earlier sessions.
  const midnight = new Date(now)
  midnight.setHours(0, 0, 0, 0)
  const earliest = todays.reduce(
    (h, s) => Math.min(h, new Date(s.start).getHours()),
    6,
  )
  const from = midnight.getTime() + earliest * 3_600_000
  const to = midnight.getTime() + 24 * 3_600_000
  const pos = (ms: number) =>
    `${Math.min(Math.max(((ms - from) / (to - from)) * 100, 0), 100)}%`
  const hours = Array.from(
    { length: 24 - earliest + 1 },
    (_, i) => earliest + i,
  ).filter((h) => h % 3 === 0)

  return (
    <Card
      icon={<CalendarClock size={16} />}
      title="Today"
      subtitle={`${todays.length} ${todays.length === 1 ? 'session' : 'sessions'} · ${formatMinutes(minutes)} focused`}
    >
      <div className="ruler" aria-hidden="true">
        <div className="ruler__track">
          {todays.map((s, i) => (
            <motion.span
              key={s.id}
              className="ruler__block"
              style={{
                left: pos(s.start),
                width: `max(3px, calc(${pos(s.end)} - ${pos(s.start)}))`,
              }}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: i * 0.04 }}
              title={`${clock(s.start)}–${clock(s.end)}`}
            />
          ))}
          <span className="ruler__now" style={{ left: pos(now.getTime()) }} />
        </div>
        <div className="ruler__labels">
          {hours.map((h) => (
            <span
              key={h}
              style={{ left: pos(midnight.getTime() + h * 3_600_000) }}
            >
              {String(h % 24).padStart(2, '0')}
            </span>
          ))}
        </div>
      </div>

      {todays.length === 0 ? (
        <p className="empty">
          No sessions yet today. Start the timer to log one.
        </p>
      ) : (
        <ul className="sessions scroll">
          <AnimatePresence initial={false}>
            {todays.map((s) => (
              <motion.li
                key={s.id}
                layout
                className="session"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <span className="session__dot" />
                <span className="session__time num">
                  {clock(s.start)} – {clock(s.end)}
                </span>
                <span className="session__task">
                  {s.taskTitle ?? <span className="subtle">No task</span>}
                </span>
                <span className="session__min num">{s.minutes}m</span>
                {confirming === s.id ? (
                  <button
                    type="button"
                    className="session__confirm"
                    onClick={() => deleteSession(s.id)}
                    onBlur={() => setConfirming(null)}
                    autoFocus
                  >
                    Delete?
                  </button>
                ) : (
                  <IconButton
                    label="Delete session"
                    size="sm"
                    onClick={() => setConfirming(s.id)}
                  >
                    <Trash2 size={14} />
                  </IconButton>
                )}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </Card>
  )
}
