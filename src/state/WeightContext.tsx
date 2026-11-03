import { useEffect, useState, type ReactNode } from 'react'
import type { DateKey } from '../lib/date.ts'
import { deletePhoto, resizePhoto, savePhoto } from '../lib/photos.ts'
import { createJsonStore } from '../lib/storage.ts'
import type { WeightEntry, WeightLog } from '../lib/weight.ts'
import { WeightContext } from './useWeights.ts'

const weightStore = createJsonStore<WeightLog>('todoapp.weight.v1', () => ({}))

/**
 * Weight per day in localStorage; photos in IndexedDB (too big for localStorage).
 * Shared by the weight panel and the weight history list.
 */
export function WeightProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState(() => weightStore.load())
  const [photoVersion, setPhotoVersion] = useState(0)

  useEffect(() => {
    weightStore.save(log)
  }, [log])

  function update(date: DateKey, patch: Partial<WeightEntry>) {
    setLog((current) => {
      const previous: WeightEntry | undefined = current[date]
      const entry: WeightEntry = {
        kg: previous?.kg ?? null,
        hasPhoto: previous?.hasPhoto ?? false,
        ...patch,
      }
      const next = { ...current }
      if (entry.kg === null && !entry.hasPhoto) delete next[date]
      else next[date] = entry
      return next
    })
  }

  async function removePhoto(date: DateKey) {
    await deletePhoto(date)
    update(date, { hasPhoto: false })
  }

  const value = {
    log,
    photoVersion,
    setWeight: (date: DateKey, kg: number | null) => update(date, { kg }),
    async setPhoto(date: DateKey, file: File) {
      await savePhoto(date, await resizePhoto(file))
      update(date, { hasPhoto: true })
      setPhotoVersion((v) => v + 1)
    },
    removePhoto,
    async deleteEntry(date: DateKey) {
      if (log[date]?.hasPhoto) await deletePhoto(date)
      update(date, { kg: null, hasPhoto: false })
    },
  }

  return <WeightContext value={value}>{children}</WeightContext>
}
