import { useEffect, useState, type ReactNode } from 'react'
import type { DateKey } from '../lib/date.ts'
import {
  deletePhotos,
  newPhotoKey,
  resizePhoto,
  savePhoto,
  THUMB_SIDE,
} from '../lib/photos.ts'
import { createJsonStore } from '../lib/storage.ts'
import { normalizeLog, type PhotoKey, type WeightEntry } from '../lib/weight.ts'
import { WeightContext } from './useWeights.ts'

const weightStore = createJsonStore<unknown>('todoapp.weight.v1', () => ({}))

/** Resizes a picked photo, makes its thumbnail and stores both under a new key. */
async function storePhoto(date: DateKey, file: Blob): Promise<PhotoKey> {
  const photo = await resizePhoto(file)
  const thumbnail = await resizePhoto(photo, THUMB_SIDE, 0.8)
  const key = newPhotoKey(date)
  await savePhoto(key, photo, thumbnail)
  return key
}

/**
 * Weight per day in localStorage; photos in IndexedDB (too big for localStorage).
 * Shared by the weight panel and the weight history list.
 */
export function WeightProvider({ children }: { children: ReactNode }) {
  const [log, setLog] = useState(() => normalizeLog(weightStore.load()))

  useEffect(() => {
    weightStore.save(log)
  }, [log])

  /** Changes one day; a day left with no weight and no photos is dropped. */
  function update(date: DateKey, change: (entry: WeightEntry) => WeightEntry) {
    setLog((current) => {
      const entry = change(current[date] ?? { kg: null, photos: [] })
      const next = { ...current }
      if (entry.kg === null && !entry.photos.length) delete next[date]
      else next[date] = entry
      return next
    })
  }

  const photosOf = (date: DateKey) => log[date]?.photos ?? []

  const value = {
    log,
    setWeight: (date: DateKey, kg: number | null) =>
      update(date, (entry) => ({ ...entry, kg })),
    async addPhoto(date: DateKey, file: File) {
      const key = await storePhoto(date, file)
      update(date, (entry) => ({ ...entry, photos: [...entry.photos, key] }))
      return key
    },
    async replacePhoto(date: DateKey, old: PhotoKey, file: File) {
      const key = await storePhoto(date, file)
      update(date, (entry) => ({
        ...entry,
        photos: entry.photos.includes(old)
          ? entry.photos.map((photo) => (photo === old ? key : photo))
          : [...entry.photos, key],
      }))
      await deletePhotos([old])
      return key
    },
    async removePhoto(date: DateKey, key: PhotoKey) {
      update(date, (entry) => ({
        ...entry,
        photos: entry.photos.filter((photo) => photo !== key),
      }))
      await deletePhotos([key])
    },
    async removeAllPhotos(date: DateKey) {
      const photos = photosOf(date)
      update(date, (entry) => ({ ...entry, photos: [] }))
      await deletePhotos(photos)
    },
    async deleteEntry(date: DateKey) {
      const photos = photosOf(date)
      update(date, () => ({ kg: null, photos: [] }))
      await deletePhotos(photos)
    },
  }

  return <WeightContext value={value}>{children}</WeightContext>
}
