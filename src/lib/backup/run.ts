import { loadPhoto, storedPhotoKeys, storeRestoredPhoto } from '../photos.ts'
import type { PhotoKey } from '../weight.ts'
import { snapshotName, type BackupProvider } from './provider.ts'
import {
  applySnapshot,
  collectSnapshot,
  parseSnapshot,
  photoKeysOf,
} from './snapshot.ts'

/** Backups kept in the bucket; older ones are deleted after each backup. */
export const KEEP_SNAPSHOTS = 10
/** Photos sent or fetched at once. */
const PARALLEL = 3

export interface Progress {
  step: 'data' | 'photos' | 'finishing'
  done?: number
  total?: number
}

export interface BackupResult {
  name: string
  photosUploaded: number
}

/** Runs `task` on every item, at most PARALLEL at a time, stopping at the first error. */
async function eachLimited<T>(
  items: readonly T[],
  task: (item: T) => Promise<void>,
): Promise<void> {
  let next = 0
  let failed = false
  const worker = async () => {
    while (!failed && next < items.length) {
      try {
        await task(items[next++])
      } catch (error) {
        failed = true // the other workers stop after their current item
        throw error
      }
    }
  }
  await Promise.all(Array.from({ length: PARALLEL }, worker))
}

/**
 * Uploads this browser's data as a new snapshot, after any of its photos the
 * bucket doesn't have yet (so a snapshot never points at a missing photo),
 * then deletes all but the newest KEEP_SNAPSHOTS.
 */
export async function backUp(
  provider: BackupProvider,
  {
    includePhotos,
    now = new Date(),
    onProgress = () => {},
  }: {
    includePhotos: boolean
    now?: Date
    onProgress?: (progress: Progress) => void
  },
): Promise<BackupResult> {
  onProgress({ step: 'data' })
  const snapshot = await collectSnapshot(now)

  let photosUploaded = 0
  if (includePhotos) {
    const uploaded = await provider.listPhotos()
    const missing = photoKeysOf(snapshot).filter((key) => !uploaded.has(key))
    if (missing.length) {
      let done = 0
      onProgress({ step: 'photos', done, total: missing.length })
      await eachLimited(missing, async (key) => {
        const photo = await loadPhoto(key)
        // A photo listed but not stored here (e.g. restored without photos).
        if (photo) {
          await provider.putPhoto(key, photo)
          photosUploaded++
        }
        onProgress({ step: 'photos', done: ++done, total: missing.length })
      })
    }
  }

  onProgress({ step: 'finishing' })
  const name = snapshotName(now)
  await provider.putSnapshot(name, JSON.stringify(snapshot))
  try {
    const all = await provider.listSnapshots()
    await provider.deleteSnapshots(
      all.slice(KEEP_SNAPSHOTS).map((info) => info.name),
    )
  } catch {
    // Old backups stay a little longer; the new one is safe either way.
  }
  return { name, photosUploaded }
}

export interface RestoreResult {
  photosRestored: number
  /** Photos the backup lists but the bucket doesn't have (backed up without photos). */
  photosMissing: number
}

/**
 * Replaces this browser's data with a snapshot from the bucket. Its photos
 * that aren't here are downloaded first: they are new keys, so if anything
 * fails before the end, this browser's data is still as it was.
 * Reload the page afterwards.
 */
export async function restoreFromBackup(
  provider: BackupProvider,
  name: string,
  onProgress: (progress: Progress) => void = () => {},
): Promise<RestoreResult> {
  onProgress({ step: 'data' })
  const snapshot = readSnapshot(await provider.getSnapshot(name))

  const wanted = photoKeysOf(snapshot)
  let photosRestored = 0
  let photosMissing = 0
  if (wanted.length) {
    const [here, uploaded] = await Promise.all([
      storedPhotoKeys(),
      provider.listPhotos(),
    ])
    const needed: PhotoKey[] = []
    for (const key of wanted) {
      if (here.has(key)) continue
      if (uploaded.has(key)) needed.push(key)
      else photosMissing++
    }
    let done = 0
    if (needed.length)
      onProgress({ step: 'photos', done, total: needed.length })
    await eachLimited(needed, async (key) => {
      await storeRestoredPhoto(key, await provider.getPhoto(key))
      photosRestored++
      onProgress({ step: 'photos', done: ++done, total: needed.length })
    })
  }

  onProgress({ step: 'finishing' })
  await applySnapshot(snapshot)
  return { photosRestored, photosMissing }
}

/** A snapshot from JSON text (a file or the bucket); throws a readable error. */
export function readSnapshot(text: string) {
  let value: unknown
  try {
    value = JSON.parse(text)
  } catch {
    throw new Error('This file isn’t a To-do backup (it isn’t JSON).')
  }
  return parseSnapshot(value)
}
