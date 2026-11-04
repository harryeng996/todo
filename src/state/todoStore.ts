import { toDateKey } from '../lib/date.ts'
import { createRecordStore } from '../lib/recordStore.ts'
import { createJsonStore } from '../lib/storage.ts'
import type { Todo } from '../types/todo.ts'
import { sampleTodos } from './todoReducer.ts'

const V1_KEY = 'todoapp.todos.v1'

type TodoV1 = Omit<Todo, 'date'>

/** v1 todos had no day; they belong to the local day they were created on. */
export function migrateV1(todos: TodoV1[]): Todo[] {
  return todos.map((todo) => ({
    ...todo,
    date: toDateKey(new Date(todo.createdAt)),
  }))
}

function initialTodos(): Todo[] {
  const v1 = createJsonStore<TodoV1[] | null>(V1_KEY, () => null).load()
  return v1 ? migrateV1(v1) : sampleTodos(toDateKey(new Date()))
}

/** The localStorage list (v2): migrated from, and used without IndexedDB. */
export const todoStore = createJsonStore<Todo[]>(
  'todoapp.todos.v2',
  initialTodos,
)

/** Todos in IndexedDB, one record each, in the order they were added. */
export const todoRecords = createRecordStore<Todo>({
  dbName: 'todoapp-todos',
  legacy: todoStore,
  legacyKeys: ['todoapp.todos.v2', V1_KEY],
  compare: (a, b) =>
    a.createdAt < b.createdAt ? -1 : a.createdAt > b.createdAt ? 1 : 0,
})
