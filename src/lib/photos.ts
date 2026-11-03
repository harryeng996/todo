import { createStore, del, get, set } from 'idb-keyval'
import type { DateKey } from './date.ts'

// One photo per day, keyed by date, in its own IndexedDB database.
const photoDb = createStore('todoapp-photos', 'photos')

export function loadPhoto(date: DateKey): Promise<Blob | undefined> {
  return get<Blob>(date, photoDb)
}

export async function savePhoto(date: DateKey, photo: Blob): Promise<void> {
  await set(date, photo, photoDb)
  // Ask the browser not to evict photos when disk space runs low (best effort).
  void navigator.storage?.persist?.()
}

export function deletePhoto(date: DateKey): Promise<void> {
  return del(date, photoDb)
}

/**
 * Downscales to at most `maxSide` px and re-encodes as JPEG: phone photos shrink
 * from several MB to a few hundred KB, EXIF rotation is applied and metadata dropped.
 */
export async function resizePhoto(
  file: Blob,
  maxSide = 1600,
  quality = 0.85,
): Promise<Blob> {
  const bitmap = await createImageBitmap(file, {
    imageOrientation: 'from-image',
  })
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error('Could not encode the photo')),
      'image/jpeg',
      quality,
    ),
  )
}
