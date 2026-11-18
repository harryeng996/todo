import { Database, ShieldCheck } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { slidesOf } from '../../../../lib/weight.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { useQuoteLibrary } from '../../../../state/useQuoteLibrary.ts'
import { useTodos } from '../../../../state/useTodos.ts'
import { useWeights } from '../../../../state/useWeights.ts'
import { Card } from '../../components/Card.tsx'

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(0)} KB`
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`
  return `${(n / 1024 ** 3).toFixed(2)} GB`
}

/** How much this browser holds for the app, and whether it is protected from eviction. */
export function DataSettings({ id }: { id: string }) {
  const { todos } = useTodos()
  const { sessions } = usePomodoro()
  const { log } = useWeights()
  const { library } = useQuoteLibrary()
  const [usage, setUsage] = useState<{ used: number; quota: number } | null>(
    null,
  )
  const [persisted, setPersisted] = useState<boolean | null>(null)

  useEffect(() => {
    let live = true
    void navigator.storage
      ?.estimate?.()
      .then(
        (e) => live && setUsage({ used: e.usage ?? 0, quota: e.quota ?? 0 }),
      )
      .catch(() => undefined)
    void navigator.storage
      ?.persisted?.()
      .then((p) => live && setPersisted(p))
      .catch(() => undefined)
    return () => {
      live = false
    }
  }, [])

  const counts = [
    { label: 'Tasks', value: todos.length },
    { label: 'Focus sessions', value: sessions.length },
    {
      label: 'Weigh-ins',
      value: Object.values(log).filter((e) => e.kg !== null).length,
    },
    { label: 'Photos', value: slidesOf(log).length },
    {
      label: 'Your quotes',
      value: library.items.filter((q) => !q.builtIn).length,
    },
  ]
  const share = usage && usage.quota ? usage.used / usage.quota : 0

  return (
    <Card
      id={id}
      icon={<Database size={16} />}
      title="Data & storage"
      subtitle="Everything stays in this browser. Nothing is uploaded."
    >
      <div className="storage">
        <div className="storage__row">
          <span>
            {usage ? `${formatBytes(usage.used)} used` : 'Measuring…'}
          </span>
          <span className="subtle">
            {usage?.quota
              ? `of about ${formatBytes(usage.quota)} available`
              : ''}
          </span>
        </div>
        <div className="bar storage__bar">
          <motion.span
            className="bar__fill"
            style={{
              background: share > 0.8 ? 'var(--danger)' : 'var(--accent)',
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: Math.max(share, usage ? 0.01 : 0) }}
            transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        {persisted !== null && (
          <p className="storage__persist">
            <ShieldCheck size={15} />
            {persisted
              ? 'Protected: the browser won’t clear this data to free up space.'
              : 'Not protected yet: the browser may clear it when the disk is nearly full. Adding a photo asks for protection.'}
          </p>
        )}
      </div>
      <dl className="data-counts">
        {counts.map((c) => (
          <div key={c.label}>
            <dt>{c.label}</dt>
            <dd className="num">{c.value}</dd>
          </div>
        ))}
      </dl>
      <p className="field-row__hint">
        Clearing this site’s data in the browser deletes all of it; an exported
        backup file brings back everything but photos. Both interfaces (v1 and
        v2) read the same data.
      </p>
    </Card>
  )
}
