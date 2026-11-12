import { Camera, History, Pencil } from 'lucide-react'
import { motion } from 'motion/react'
import { useState } from 'react'
import { formatDayShort, type DateKey } from '../../../../lib/date.ts'
import { toUnit, type WeightUnit } from '../../../../lib/weight.ts'
import { useWeights } from '../../../../state/useWeights.ts'
import { Button, IconButton } from '../../components/Button.tsx'
import { Card } from '../../components/Card.tsx'
import { Delta } from '../../components/StatTile.tsx'

const PAGE = 15

/** Every logged day, newest first, with the change from the entry before. */
export function WeightLog({
  unit,
  onEdit,
}: {
  unit: WeightUnit
  onEdit: (date: DateKey) => void
}) {
  const { log } = useWeights()
  const [limit, setLimit] = useState(PAGE)
  const days = Object.keys(log).sort().reverse()
  const weighed = days.filter((d) => log[d].kg !== null)

  return (
    <Card
      icon={<History size={16} />}
      title="Log"
      subtitle={`${weighed.length} weigh-ins`}
    >
      {days.length === 0 ? (
        <p className="empty">Nothing logged yet.</p>
      ) : (
        <>
          <ul className="wlog">
            {days.slice(0, limit).map((date, i) => {
              const entry = log[date]
              const prev = weighed.find((d) => d < date)
              const change =
                entry.kg !== null && prev
                  ? toUnit(entry.kg - log[prev].kg!, unit)
                  : null
              return (
                <motion.li
                  key={date}
                  className="wlog__row"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i, 10) * 0.025 }}
                >
                  <span className="wlog__date">{formatDayShort(date)}</span>
                  <span className="wlog__kg num">
                    {entry.kg !== null
                      ? `${toUnit(entry.kg, unit).toFixed(1)} ${unit}`
                      : '—'}
                  </span>
                  <span className="wlog__delta">
                    {change !== null && (
                      <Delta
                        change={change}
                        format={(v) => v.toFixed(1)}
                        good="none"
                      />
                    )}
                  </span>
                  <span className="wlog__photos">
                    {entry.photos.length > 0 && (
                      <>
                        <Camera size={13} /> {entry.photos.length}
                      </>
                    )}
                  </span>
                  <IconButton
                    label={`Edit ${formatDayShort(date)}`}
                    size="sm"
                    onClick={() => onEdit(date)}
                  >
                    <Pencil size={14} />
                  </IconButton>
                </motion.li>
              )
            })}
          </ul>
          {days.length > limit && (
            <Button
              variant="secondary"
              className="gallery__more"
              onClick={() => setLimit((l) => l + PAGE)}
            >
              Show more ({days.length - limit})
            </Button>
          )}
        </>
      )}
    </Card>
  )
}
