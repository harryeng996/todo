import { toDateKey } from '../date.ts'
import { collectSnapshot, readSnapshot, type Snapshot } from './snapshot.ts'

/** Saves this browser's data (without photos) as a JSON file. */
export async function downloadBackupFile(now = new Date()): Promise<void> {
  const snapshot = await collectSnapshot(now)
  const blob = new Blob([JSON.stringify(snapshot, null, 2)], {
    type: 'application/json',
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `todo-backup-${toDateKey(now)}.json`
  document.body.append(link)
  link.click()
  link.remove()
  // Some browsers start the download after click() returns.
  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

/** Reads a backup file; throws a readable error for anything else. */
export async function readBackupFile(file: File): Promise<Snapshot> {
  return readSnapshot(await file.text())
}
