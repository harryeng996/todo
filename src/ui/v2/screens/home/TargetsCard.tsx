import { Plus, Target as TargetIcon } from 'lucide-react'
import { motion } from 'motion/react'
import { daysBetween, formatDayMonth } from '../../../../lib/date.ts'
import { countdownFor } from '../../../../state/useTarget.ts'
import { useToday } from '../../../../state/useToday.ts'
import { Button } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { navigate } from '../../lib/router.ts'
import { useTargetList } from '../../state/appContext.ts'

export function TargetsCard() {
  const today = useToday()
  const { targets } = useTargetList()
  const sorted = [...targets].sort((a, b) => (a.endDate < b.endDate ? -1 : 1))

  return (
    <Card
      className="targets"
      icon={<TargetIcon size={16} />}
      title="Targets"
      subtitle={targets.length ? `${targets.length} counting down` : undefined}
      action={
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('settings', 'targets')}
        >
          <Plus size={15} /> {targets.length ? 'Manage' : 'Add'}
        </Button>
      }
    >
      {sorted.length === 0 ? (
        <p className="empty">
          Set a goal with a date (an exam, a launch, a race) and watch the days
          count down.
        </p>
      ) : (
        <ul className="targets__list">
          {sorted.map((target, i) => {
            const { progress, status } = countdownFor(target, today)
            const left = Math.max(daysBetween(today, target.endDate), 0)
            const tone =
              progress >= 1
                ? 'var(--body)'
                : progress > 0.8
                  ? 'var(--focus)'
                  : 'var(--accent)'
            return (
              <motion.li
                key={target.id}
                className="target"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.06 }}
              >
                <div className="target__days num" style={{ color: tone }}>
                  {left}
                  <span>{left === 1 ? 'day' : 'days'}</span>
                </div>
                <div className="target__body">
                  <div className="target__row">
                    <strong className="target__title">{target.title}</strong>
                    <span className="target__pct num">
                      {Math.round(progress * 100)}%
                    </span>
                  </div>
                  <div
                    className="bar"
                    role="progressbar"
                    aria-valuenow={Math.round(progress * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${target.title} time elapsed`}
                  >
                    <motion.span
                      className="bar__fill"
                      style={{ background: tone }}
                      initial={{ scaleX: 0 }}
                      animate={{ scaleX: progress }}
                      transition={{
                        duration: 1,
                        delay: 0.2 + i * 0.06,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                    />
                  </div>
                  <span className="target__meta">
                    {formatDayMonth(target.startDate)} →{' '}
                    {formatDayMonth(target.endDate)} · {status}
                  </span>
                </div>
              </motion.li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}
