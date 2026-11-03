import type { Todo } from '../types/todo.ts'

export interface TodoRepository {
  /** Returns null when nothing has been saved yet (first visit). */
  load(): Todo[] | null
  save(todos: Todo[]): void
}

const STORAGE_KEY = 'todoapp.todos.v1'

export const localStorageRepository: TodoRepository = {
  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw === null ? null : (JSON.parse(raw) as Todo[])
    } catch {
      return null
    }
  },
  save(todos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos))
    } catch {
      // Storage blocked or full: the app keeps working in memory.
    }
  },
}
