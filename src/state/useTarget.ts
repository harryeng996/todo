import { useEffect, useState } from 'react'
import { daysBetween, type DateKey } from '../lib/date.ts'
import { createJsonStore } from '../lib/storage.ts'
import type { Target, TargetFields } from '../types/target.ts'

/** v1 stored a single target; it becomes the first item of the list. */
export function migrateV1Target(single: TargetFields | null): Target[] {
  return single ? [{ ...single, id: crypto.randomUUID() }] : []
}

const targetsStore = createJsonStore<Target[]>('todoapp.targets.v2', () =>
  migrateV1Target(
    createJsonStore<TargetFields | null>(
      'todoapp.target.v1',
      () => null,
    ).load(),
  ),
)

/** Several objectives can be counted down under the clock. */
export function useTargets() {
  const [targets, setTargets] = useState(() => targetsStore.load())

  useEffect(() => {
    targetsStore.save(targets)
  }, [targets])

  return {
    targets,
    /** Adds the target, or replaces the one with the same id. */
    saveTarget(target: Target) {
      setTargets((list) =>
        list.some((t) => t.id === target.id)
          ? list.map((t) => (t.id === target.id ? target : t))
          : [...list, target],
      )
    },
    removeTarget(id: string) {
      setTargets((list) => list.filter((t) => t.id !== id))
    },
  }
}

export interface Countdown {
  /** 0..1, counting today as elapsed (the final day shows 100%). */
  progress: number
  status: string
}

export function countdownFor(target: TargetFields, today: DateKey): Countdown {
  const total = daysBetween(target.startDate, target.endDate) + 1
  const elapsed = daysBetween(target.startDate, today) + 1
  const progress = Math.min(Math.max(elapsed / total, 0), 1)

  const daysLeft = daysBetween(today, target.endDate)
  let status: string
  if (today < target.startDate) {
    const until = daysBetween(today, target.startDate)
    status = `starts in ${until} ${until === 1 ? 'day' : 'days'}`
  } else if (daysLeft < 0) status = 'target reached'
  else if (daysLeft === 0) status = 'last day!'
  else status = `${daysLeft} ${daysLeft === 1 ? 'day' : 'days'} left`

  return { progress, status }
}
