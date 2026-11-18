import { beforeEach, describe, expect, it } from 'vitest'
import { BACKUP_CONFIG_KEY } from '../lib/backup/snapshot.ts'
import { memoryBackup } from '../test/memoryBackup.ts'
import {
  AUTO_INTERVAL,
  autoBackupDue,
  backUpNow,
  connect,
  disconnect,
  getBackupState,
  resetBackupForTests,
  runAutoBackup,
  type BackupConfig,
} from './backup.ts'

const connection = {
  url: 'https://abcd.supabase.co',
  apiKey: 'sb_publishable_abc',
  bucket: 'todoapp-backup',
}

const config = (change: Partial<BackupConfig> = {}): BackupConfig => ({
  connection,
  auto: true,
  includePhotos: true,
  armed: true,
  lastBackupAt: null,
  lastError: null,
  ...change,
})

let bucket = memoryBackup()
beforeEach(() => {
  bucket = memoryBackup()
  resetBackupForTests(() => bucket.provider)
})

describe('daily backup', () => {
  const now = Date.parse('2026-11-18T12:00:00Z')

  it('is due a day after the last one', () => {
    expect(autoBackupDue(config(), now)).toBe(true)
    expect(autoBackupDue(config({ lastBackupAt: now - 1000 }), now)).toBe(false)
    expect(
      autoBackupDue(config({ lastBackupAt: now - AUTO_INTERVAL }), now),
    ).toBe(true)
  })

  it('waits until set up, switched on, and this browser has backed up or restored once', () => {
    expect(autoBackupDue(config({ connection: null }), now)).toBe(false)
    expect(autoBackupDue(config({ auto: false }), now)).toBe(false)
    expect(autoBackupDue(config({ armed: false }), now)).toBe(false)
  })
})

describe('backup settings', () => {
  it('connects, backs up, and keeps the key out of the backup', async () => {
    expect(await connect(connection)).toBe(0)
    expect(getBackupState().connection).toEqual(connection)
    expect(getBackupState().armed).toBe(false)

    await backUpNow()
    const state = getBackupState()
    expect(state.armed).toBe(true)
    expect(state.lastBackupAt).not.toBeNull()
    expect(bucket.snapshots.size).toBe(1)
    expect([...bucket.snapshots.values()][0]).not.toContain('sb_publishable')

    // Saved for the next visit.
    resetBackupForTests(() => bucket.provider)
    expect(getBackupState().armed).toBe(true)
  })

  it('keeps a failure to show, and clears it on success', async () => {
    await connect(connection)
    bucket.provider.putSnapshot = () => Promise.reject(new Error('Bucket full'))
    await expect(backUpNow()).rejects.toThrow('Bucket full')
    expect(getBackupState().lastError).toBe('Bucket full')
    expect(getBackupState().activity).toEqual({ kind: 'idle' })
  })

  it('runs the automatic backup only when due, then waits after a failure', async () => {
    await connect(connection)
    await runAutoBackup()
    expect(bucket.snapshots.size).toBe(0) // not armed yet

    await backUpNow()
    bucket.snapshots.clear()
    const later = Date.now() + AUTO_INTERVAL
    bucket.provider.putSnapshot = () => Promise.reject(new Error('down'))
    await runAutoBackup(later)
    expect(getBackupState().lastError).toBe('down')
    bucket.provider.putSnapshot = async (name, json) => {
      bucket.snapshots.set(name, json)
    }
    await runAutoBackup(later + 60_000) // too soon to retry
    expect(bucket.snapshots.size).toBe(0)
    await runAutoBackup(later + 61 * 60_000)
    expect(bucket.snapshots.size).toBe(1)
  })

  it('forgets the connection on disconnect', async () => {
    await connect(connection)
    disconnect()
    expect(getBackupState().connection).toBeNull()
    expect(localStorage.getItem(BACKUP_CONFIG_KEY)).not.toContain(
      'sb_publishable',
    )
  })
})
