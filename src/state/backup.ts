import { useSyncExternalStore } from 'react'
import { BackupError, type BackupProvider } from '../lib/backup/provider.ts'
import {
  backUp,
  restoreFromBackup,
  type BackupResult,
  type Progress,
  type RestoreResult,
} from '../lib/backup/run.ts'
import { BACKUP_CONFIG_KEY } from '../lib/backup/snapshot.ts'
import {
  createSupabaseProvider,
  type SupabaseConnection,
} from '../lib/backup/supabase.ts'
import { createJsonStore } from '../lib/storage.ts'

export interface BackupConfig {
  /** Null until connected. Kept only in this browser, never in a backup. */
  connection: SupabaseConnection | null
  /** Back up once a day while the app is open. */
  auto: boolean
  includePhotos: boolean
  /**
   * Automatic backups start only after this browser has backed up or
   * restored once, so a new device can't save its empty data as the newest
   * backup before you get the chance to restore.
   */
  armed: boolean
  lastBackupAt: number | null
  /** Why the last backup failed (cleared by the next success). */
  lastError: string | null
}

const DEFAULTS: BackupConfig = {
  connection: null,
  auto: true,
  includePhotos: true,
  armed: false,
  lastBackupAt: null,
  lastError: null,
}

const configStore = createJsonStore<Partial<BackupConfig>>(
  BACKUP_CONFIG_KEY,
  () => ({}),
)

export type Activity =
  { kind: 'idle' } | { kind: 'backup' | 'restore'; progress: Progress }

export interface BackupState extends BackupConfig {
  activity: Activity
}

/** How often an open app looks whether a daily backup is due. */
const CHECK_EVERY = 30 * 60_000
export const AUTO_INTERVAL = 24 * 60 * 60_000

let state: BackupState | null = null
const listeners = new Set<() => void>()
let makeProvider: (connection: SupabaseConnection) => BackupProvider =
  createSupabaseProvider

function current(): BackupState {
  state ??= { ...DEFAULTS, ...configStore.load(), activity: { kind: 'idle' } }
  return state
}

function set(change: Partial<BackupState>) {
  state = { ...current(), ...change }
  // Progress changes often and isn't kept; only save the settings.
  if (Object.keys(change).some((key) => key !== 'activity')) {
    const { activity, ...config } = state
    void activity
    configStore.save(config)
  }
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getBackupState(): BackupState {
  return current()
}

export function useBackup(): BackupState {
  return useSyncExternalStore(subscribe, current)
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : 'Something went wrong.'

function provider(): BackupProvider {
  const { connection } = current()
  if (!connection) throw new BackupError('Backup isn’t set up.')
  return makeProvider(connection)
}

/**
 * Checks the connection and saves it. Returns how many backups the bucket
 * already holds, so a new device can offer to restore one.
 */
export async function connect(connection: SupabaseConnection): Promise<number> {
  const candidate = makeProvider(connection)
  await candidate.check()
  const existing = await candidate.listSnapshots()
  set({ connection, lastError: null })
  return existing.length
}

/** Forgets the connection (the bucket and its backups are untouched). */
export function disconnect(): void {
  set({ connection: null, armed: false, lastError: null, lastBackupAt: null })
}

export function updateBackupOptions(
  change: Partial<Pick<BackupConfig, 'auto' | 'includePhotos'>>,
): void {
  set(change)
}

function busy(): boolean {
  return current().activity.kind !== 'idle'
}

export async function backUpNow(): Promise<BackupResult> {
  if (busy()) throw new BackupError('A backup or restore is already running.')
  const { includePhotos } = current()
  set({ activity: { kind: 'backup', progress: { step: 'data' } } })
  try {
    const result = await backUp(provider(), {
      includePhotos,
      onProgress: (progress) => set({ activity: { kind: 'backup', progress } }),
    })
    set({
      activity: { kind: 'idle' },
      lastBackupAt: Date.now(),
      lastError: null,
      armed: true,
    })
    return result
  } catch (error) {
    set({ activity: { kind: 'idle' }, lastError: messageOf(error) })
    throw error
  }
}

/** Restores a backup from the bucket. Reload the page afterwards. */
export async function restoreNow(name: string): Promise<RestoreResult> {
  if (busy()) throw new BackupError('A backup or restore is already running.')
  set({ activity: { kind: 'restore', progress: { step: 'data' } } })
  try {
    const result = await restoreFromBackup(provider(), name, (progress) =>
      set({ activity: { kind: 'restore', progress } }),
    )
    // This browser now matches that backup, so daily backups may begin.
    set({ activity: { kind: 'idle' }, armed: true, lastError: null })
    return result
  } catch (error) {
    set({ activity: { kind: 'idle' } })
    throw error
  }
}

export function listBackups() {
  return provider().listSnapshots()
}

/** Whether a daily backup should run now. */
export function autoBackupDue(config: BackupConfig, now: number): boolean {
  return (
    !!config.connection &&
    config.auto &&
    config.armed &&
    (config.lastBackupAt === null || now - config.lastBackupAt >= AUTO_INTERVAL)
  )
}

let lastAttempt = 0

/** Backs up if one is due; a failure is kept in `lastError` and retried later. */
export async function runAutoBackup(now = Date.now()): Promise<void> {
  if (busy() || !autoBackupDue(current(), now)) return
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return
  // After a failure, wait an hour before trying again.
  if (now - lastAttempt < 60 * 60_000) return
  lastAttempt = now
  await backUpNow().catch(() => {})
}

/** Starts the daily backup while the app is open; returns the stop function. */
export function startAutoBackup(): () => void {
  const check = () => {
    if (document.visibilityState !== 'hidden') void runAutoBackup()
  }
  // A little after opening, so the first screen loads first.
  const first = setTimeout(check, 5000)
  const timer = setInterval(check, CHECK_EVERY)
  document.addEventListener('visibilitychange', check)
  window.addEventListener('online', check)
  return () => {
    clearTimeout(first)
    clearInterval(timer)
    document.removeEventListener('visibilitychange', check)
    window.removeEventListener('online', check)
  }
}

/** Tests only: a fake provider, and a fresh state read from storage. */
export function resetBackupForTests(
  factory: (
    connection: SupabaseConnection,
  ) => BackupProvider = createSupabaseProvider,
): void {
  makeProvider = factory
  state = null
  lastAttempt = 0
}
