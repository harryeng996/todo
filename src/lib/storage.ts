export interface JsonStore<T> {
  load(): T
  save(value: T): void
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
      } catch {
        // Storage blocked or full: the app keeps working in memory.
      }
    },
  }
}
