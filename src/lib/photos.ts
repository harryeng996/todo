import {
  createStore,
  delMany,
  get,
  keys,
  set,
  setMany,
  update,
} from 'idb-keyval'
import type { DateKey } from './date.ts'

// One photo per day, keyed by date, in its own IndexedDB database. Each has a
// small thumbnail beside it (key 'thumb:<date>') for the lists, so they never
// have to load and decode full-size photos.
const photoDb = createStore('todoapp-photos', 'photos')

const THUMB_PREFIX = 'thumb:'
const thumbKey = (date: DateKey) => THUMB_PREFIX + date
/** Set once every photo saved before thumbnails existed has one. */
const BACKFILL_DONE = 'meta:thumbnails-backfilled'

/** Longest side of a thumbnail: sharp at 72 px on a 3× screen. */
export const THUMB_SIDE = 240

export function loadPhoto(date: DateKey): Promise<Blob | undefined> {
  return get<Blob>(date, photoDb)
}

/**
 * The day's thumbnail. A photo saved before thumbnails existed gets one made
 * (and stored) now, ahead of the background backfill. Abort `signal` when the
 * thumbnail is no longer on screen, so it stops jumping that queue.
 */
export async function loadThumbnail(
  date: DateKey,
  signal?: AbortSignal,
): Promise<Blob | undefined> {
  const thumb = await get<Blob>(thumbKey(date), photoDb)
  return thumb ?? makeThumbnail(date, signal)
}

/** Saves the photo and its thumbnail together (both or neither). */
export async function savePhoto(
  date: DateKey,
  photo: Blob,
  thumbnail: Blob,
): Promise<void> {
  await setMany(
    [
      [date, photo],
      [thumbKey(date), thumbnail],
    ],
    photoDb,
  )
  // Ask the browser not to evict photos when disk space runs low (best effort).
  void navigator.storage?.persist?.()
}

export function deletePhoto(date: DateKey): Promise<void> {
  return delMany([date, thumbKey(date)], photoDb)
}

// Making missing thumbnails. Decoding a full photo is the slow part, so at
// most two run at once: thumbnails someone is waiting to see go first, the
// rest one at a time when the browser is idle. A day is never made twice.

interface ThumbnailJob {
  /** How many visible thumbnails wait for it (0 = background work). */
  waiting: number
  started: boolean
  promise: Promise<Blob | undefined>
  resolve: (thumb: Blob | undefined) => void
}

const jobs = new Map<DateKey, ThumbnailJob>()
const MAX_RUNNING = 2
let running = 0
let idleScheduled = false

function makeThumbnail(
  date: DateKey,
  signal?: AbortSignal,
): Promise<Blob | undefined> {
  let job = jobs.get(date)
  if (!job) {
    let resolve!: ThumbnailJob['resolve']
    const promise = new Promise<Blob | undefined>((r) => (resolve = r))
    job = { waiting: 0, started: false, promise, resolve }
    jobs.set(date, job)
  }
  if (signal && !signal.aborted) {
    const wanted = job
    wanted.waiting++
    signal.addEventListener('abort', () => wanted.waiting--, { once: true })
  }
  pump()
  return job.promise
}

function pump() {
  for (const [date, job] of jobs) {
    if (running >= MAX_RUNNING) return
    if (!job.started && job.waiting > 0) start(date, job)
  }
  // Background work: one at a time, only when nothing else is running.
  if (running > 0 || idleScheduled) return
  if (![...jobs.values()].some((job) => !job.started)) return
  idleScheduled = true
  whenIdle(() => {
    idleScheduled = false
    if (running === 0) {
      const next = [...jobs].find(([, job]) => !job.started)
      if (next) start(...next)
    }
    pump()
  })
}

function start(date: DateKey, job: ThumbnailJob) {
  job.started = true
  running++
  void buildThumbnail(date)
    .catch(() => undefined)
    .then((thumb) => {
      running--
      jobs.delete(date)
      job.resolve(thumb)
      pump()
    })
}

async function buildThumbnail(date: DateKey): Promise<Blob | undefined> {
  const existing = await get<Blob>(thumbKey(date), photoDb)
  if (existing) return existing
  const photo = await loadPhoto(date)
  if (!photo) return undefined
  let thumb: Blob
  try {
    thumb = await resizePhoto(photo, THUMB_SIDE, 0.8)
  } catch {
    return photo // couldn't shrink it: the full photo still shows
  }
  // Atomic, and only if still missing: a photo replaced meanwhile has saved
  // its own thumbnail, which must not be overwritten by this older one.
  let stored: Blob | undefined
  await update<Blob>(
    thumbKey(date),
    (current) => (stored = current ?? thumb),
    photoDb,
  ).catch(() => {}) // best effort
  return stored ?? thumb
}

function whenIdle(callback: () => void) {
  if (typeof requestIdleCallback === 'function')
    requestIdleCallback(callback, { timeout: 2000 })
  else setTimeout(callback, 100) // Safari
}

let backfillStarted = false

/**
 * Makes thumbnails for photos saved before thumbnails existed, in idle time,
 * so scrolling the history never waits for them. Does nothing once done.
 */
export async function backfillThumbnails(): Promise<void> {
  if (backfillStarted) return
  backfillStarted = true
  try {
    if (await get(BACKFILL_DONE, photoDb)) return
    const all = new Set((await keys(photoDb)).map(String))
    const missing = [...all].filter(
      (key) =>
        !key.startsWith(THUMB_PREFIX) &&
        !key.startsWith('meta:') &&
        !all.has(thumbKey(key)),
    )
    await Promise.all(missing.map((date) => makeThumbnail(date)))
    await set(BACKFILL_DONE, true, photoDb)
  } catch {
    // No IndexedDB, or it failed: thumbnails are still made when shown.
  }
}

/** Tests only: forget that a backfill ran in this page. */
export function resetBackfill(): void {
  backfillStarted = false
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
