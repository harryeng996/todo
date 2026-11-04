import { createStore, promisifyRequest } from 'idb-keyval'
import { reportStorageError, type JsonStore } from './storage.ts'

export interface StoredRecord {
  id: string
}

/**
 * A growing list (todos, focus sessions) kept in IndexedDB, one record per
 * item, so a change writes only that item instead of the whole list, and the
 * list isn't limited by localStorage's ~5 MB.
 */
export interface RecordStore<T extends StoredRecord> {
  /**
   * The list straight away when it lives in localStorage (no IndexedDB in this
   * browser); undefined when it has to be read with `load()`.
   */
  loadNow(): T[] | undefined
  load(): Promise<T[]>
  /**
   * Saves what changed from `previous` to `next`. Items are compared by
   * reference, so unchanged ones (same object) aren't written again.
   */
  sync(previous: T[], next: T[]): Promise<void>
}

interface RecordStoreOptions<T> {
  /** IndexedDB database name (one database per list). */
  dbName: string
  /**
   * The localStorage list this replaces: copied over on first use, then its
   * keys are removed. Still used in browsers without IndexedDB.
   */
  legacy: JsonStore<T[]>
  legacyKeys: string[]
  /** Order of the loaded list (IndexedDB returns records by id). */
  compare: (a: T, b: T) => number
}

/** Marks a store whose first fill is done (it may be empty after that). */
const READY = '\u0000ready'
// Every record id sorts after READY, so this range is all records and no marker.
const recordsOnly = () => IDBKeyRange.lowerBound(READY, true)

export function createRecordStore<T extends StoredRecord>({
  dbName,
  legacy,
  legacyKeys,
  compare,
}: RecordStoreOptions<T>): RecordStore<T> {
  // 'json' without IndexedDB, or once it failed to open: localStorage as before.
  let mode: 'idb' | 'json' | undefined
  let loading: Promise<T[]> | null = null

  // createStore opens the database on first use, so this is safe without IndexedDB.
  const store = createStore(dbName, 'records')

  async function loadFromIdb(): Promise<T[]> {
    try {
      const [ready, items] = await store('readonly', (records) =>
        Promise.all([
          promisifyRequest(records.get(READY)),
          promisifyRequest(records.getAll(recordsOnly()) as IDBRequest<T[]>),
        ]),
      )
      if (ready) {
        mode = 'idb'
        return items.sort(compare)
      }
      // First use: copy the localStorage list over (or its first-visit default).
      const initial = legacy.load()
      await store('readwrite', (records) => {
        for (const item of initial) records.put(item, item.id)
        records.put(true, READY)
        return promisifyRequest(records.transaction)
      })
      for (const key of legacyKeys) {
        try {
          localStorage.removeItem(key)
        } catch {
          // Blocked storage: the copy is in IndexedDB either way.
        }
      }
      mode = 'idb'
      return [...initial].sort(compare)
    } catch (error) {
      reportStorageError(error)
      mode = 'json'
      return legacy.load()
    }
  }

  function loadNow(): T[] | undefined {
    if (mode === 'idb') return undefined
    if (mode === 'json' || typeof indexedDB === 'undefined') {
      mode = 'json'
      return legacy.load()
    }
    return undefined
  }

  return {
    loadNow,

    load() {
      const now = loadNow()
      if (now) return Promise.resolve(now)
      // Shared while in flight, so two callers can't both do the first copy.
      loading ??= loadFromIdb().finally(() => {
        loading = null
      })
      return loading
    },

    async sync(previous, next) {
      if (previous === next) return
      if (mode !== 'idb') {
        legacy.save(next)
        return
      }
      const before = new Map(previous.map((item) => [item.id, item]))
      const changed = next.filter((item) => before.get(item.id) !== item)
      const kept = new Set(next.map((item) => item.id))
      const removed = previous.filter((item) => !kept.has(item.id))
      if (changed.length === 0 && removed.length === 0) return
      try {
        await store('readwrite', (records) => {
          for (const item of changed) records.put(item, item.id)
          for (const item of removed) records.delete(item.id)
          return promisifyRequest(records.transaction)
        })
      } catch (error) {
        reportStorageError(error)
      }
    },
  }
}
