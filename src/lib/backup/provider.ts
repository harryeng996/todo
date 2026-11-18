import type { PhotoKey } from '../weight.ts'

/** A backup kept by a provider. */
export interface SnapshotInfo {
  /** The provider's name for it; pass back to get or delete it. */
  name: string
  createdAt: Date
  /** Bytes, when the provider says. */
  size: number | null
}

/**
 * Somewhere backups are kept (one Supabase bucket for now). Snapshots are
 * JSON; photos are stored one each under their key, which is never reused,
 * so a photo already there never has to be uploaded again.
 *
 * Every method throws a BackupError whose message can be shown as is.
 */
export interface BackupProvider {
  /** Checks that it can write and read back (URL, key, bucket, permissions). */
  check(): Promise<void>
  /** Newest first. */
  listSnapshots(): Promise<SnapshotInfo[]>
  putSnapshot(name: string, json: string): Promise<void>
  getSnapshot(name: string): Promise<string>
  deleteSnapshots(names: readonly string[]): Promise<void>
  listPhotos(): Promise<Set<PhotoKey>>
  putPhoto(key: PhotoKey, photo: Blob): Promise<void>
  getPhoto(key: PhotoKey): Promise<Blob>
}

/** A problem worth showing as is: wrong key, missing bucket, offline… */
export class BackupError extends Error {
  override name = 'BackupError'
}

/** A snapshot's name from when it was taken: 2026-11-18T09-05-07-123Z.json */
export function snapshotName(date: Date): string {
  return `${date.toISOString().replace(/[:.]/g, '-')}.json`
}

/** The time in a snapshot's name, or null for any other file. */
export function snapshotTime(name: string): Date | null {
  const match = /^(\d{4}-\d\d-\d\d)T(\d\d)-(\d\d)-(\d\d)-(\d{3})Z\.json$/.exec(
    name,
  )
  if (!match) return null
  const [, day, h, m, s, ms] = match
  const date = new Date(`${day}T${h}:${m}:${s}.${ms}Z`)
  return Number.isNaN(date.getTime()) ? null : date
}
