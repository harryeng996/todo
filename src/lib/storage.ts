export interface JsonStore<T> {
  load(): T
  /** False when the value couldn't be saved (storage blocked or full). */
  save(value: T): boolean
}

/** The browser refused a write because this site's storage is full. */
export function isQuotaError(error: unknown): boolean {
  return (
    error instanceof DOMException &&
    (error.name === 'QuotaExceededError' ||
      error.name === 'NS_ERROR_DOM_QUOTA_REACHED') // older Firefox
  )
}

// Storage-full notice: saves report here, the page shows one notice.
const fullListeners = new Set<() => void>()
let storageFull = false

/** Call when a save fails; a full storage is reported to the page. */
export function reportStorageError(error: unknown): void {
  if (!isQuotaError(error) || storageFull) return
  storageFull = true
  fullListeners.forEach((listener) => listener())
}

export function isStorageFull(): boolean {
  return storageFull
}

/** For useSyncExternalStore; returns the unsubscribe function. */
export function subscribeStorageFull(listener: () => void): () => void {
  fullListeners.add(listener)
  return () => fullListeners.delete(listener)
}

/** Tests only: forget an earlier storage-full report. */
export function resetStorageFull(): void {
  storageFull = false
}

/** A JSON value in localStorage. `fallback` is used when nothing is saved or it can't be read. */
export function createJsonStore<T>(
  key: string,
  fallback: () => T,
): JsonStore<T> {
  return {
    load() {
      try {
        const raw = localStorage.getItem(key)
        return raw === null ? fallback() : (JSON.parse(raw) as T)
      } catch {
        return fallback()
      }
    },
    save(value) {
      try {
        localStorage.setItem(key, JSON.stringify(value))
        return true
      } catch (error) {
        // The app keeps working in memory; a full storage gets a notice.
        reportStorageError(error)
        return false
      }
    },
  }
}
