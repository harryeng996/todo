import { sessionRecords } from '../../state/sessionStore.ts'
import type { FocusSession } from '../../state/pomodoro.ts'
import { todoRecords } from '../../state/todoStore.ts'
import type { Todo } from '../../types/todo.ts'
import { normalizeLog, slidesOf, type PhotoKey } from '../weight.ts'

/** Where the backup settings (with the API key) are kept. Never backed up. */
export const BACKUP_CONFIG_KEY = 'todoapp.backup.v1'

const PREFIX = 'todoapp.'
/** The weight log (WeightContext); its days list the photo keys. */
const WEIGHT_KEY = 'todoapp.weight.v1'

/**
 * localStorage keys a snapshot leaves alone, on both backup and restore:
 * the backup settings, a running timer (belongs to this device), and the
 * lists' old localStorage copies (the lists travel as `todos` / `sessions`).
 */
const LOCAL_ONLY = new Set([
  BACKUP_CONFIG_KEY,
  'todoapp.pomodoro.timer.v1',
  'todoapp.todos.v1',
  'todoapp.todos.v2',
  'todoapp.pomodoro.sessions.v1',
])

const FORMAT = 1

/** Everything the app keeps, except photos (they are stored one by one). */
export interface Snapshot {
  app: 'todoapp'
  format: typeof FORMAT
  /** ISO time it was taken. */
  createdAt: string
  /** Every saved `todoapp.*` localStorage value, parsed. */
  local: Record<string, unknown>
  todos: Todo[]
  sessions: FocusSession[]
}

/** The app's own localStorage keys that a snapshot carries. */
function backedUpKeys(): string[] {
  const found: string[] = []
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)
    if (key?.startsWith(PREFIX) && !LOCAL_ONLY.has(key)) found.push(key)
  }
  return found.sort()
}

export async function collectSnapshot(now = new Date()): Promise<Snapshot> {
  const local: Record<string, unknown> = {}
  for (const key of backedUpKeys()) {
    try {
      local[key] = JSON.parse(localStorage.getItem(key)!)
    } catch {
      // Not JSON: nothing in the app wrote it.
    }
  }
  const [todos, sessions] = await Promise.all([
    todoRecords.load(),
    sessionRecords.load(),
  ])
  return {
    app: 'todoapp',
    format: FORMAT,
    createdAt: now.toISOString(),
    local,
    todos,
    sessions,
  }
}

/** A snapshot's photos, oldest day first. */
export function photoKeysOf(snapshot: Snapshot): PhotoKey[] {
  return slidesOf(normalizeLog(snapshot.local[WEIGHT_KEY])).map(
    (slide) => slide.photo,
  )
}

const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value)

const isRecordList = (value: unknown): value is { id: string }[] =>
  Array.isArray(value) &&
  value.every((item) => isObject(item) && typeof item.id === 'string')

/** Checks that `value` is a snapshot this version can restore; throws a readable error if not. */
export function parseSnapshot(value: unknown): Snapshot {
  if (!isObject(value) || value.app !== 'todoapp')
    throw new Error('This isn’t a To-do backup.')
  if (typeof value.format !== 'number' || value.format > FORMAT)
    throw new Error(
      'This backup was made by a newer version of the app. Reload to update, then try again.',
    )
  if (
    typeof value.createdAt !== 'string' ||
    Number.isNaN(Date.parse(value.createdAt)) ||
    !isObject(value.local) ||
    !isRecordList(value.todos) ||
    !isRecordList(value.sessions)
  )
    throw new Error('This backup is damaged and can’t be restored.')
  return value as unknown as Snapshot
}

/**
 * Replaces this browser's data with the snapshot's (photos aside). Reload the
 * page afterwards: the open screens still hold the old data.
 */
export async function applySnapshot(snapshot: Snapshot): Promise<void> {
  // The lists first: if IndexedDB fails, nothing else has changed yet.
  await todoRecords.replaceAll(snapshot.todos)
  await sessionRecords.replaceAll(snapshot.sessions)
  for (const key of backedUpKeys()) localStorage.removeItem(key)
  for (const [key, value] of Object.entries(snapshot.local)) {
    if (!key.startsWith(PREFIX) || LOCAL_ONLY.has(key)) continue
    localStorage.setItem(key, JSON.stringify(value))
  }
}
