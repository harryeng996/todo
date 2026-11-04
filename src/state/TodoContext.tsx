import { useEffect, useReducer, useRef, useState, type ReactNode } from 'react'
import type { RecordStore } from '../lib/recordStore.ts'
import type { Todo } from '../types/todo.ts'
import { todoReducer } from './todoReducer.ts'
import { todoRecords } from './todoStore.ts'
import { TodoContext } from './useTodos.ts'

interface TodoProviderProps {
  children: ReactNode
  store?: RecordStore<Todo>
}

export function TodoProvider({
  children,
  store = todoRecords,
}: TodoProviderProps) {
  const [initial, setInitial] = useState(() => store.loadNow() ?? null)

  useEffect(() => {
    if (initial) return
    let cancelled = false
    void store.load().then((todos) => {
      if (!cancelled) setInitial(todos)
    })
    return () => {
      cancelled = true
    }
  }, [initial, store])

  // Nothing to show until the list is read (a few ms from IndexedDB).
  if (!initial) return null
  return (
    <LoadedTodos initial={initial} store={store}>
      {children}
    </LoadedTodos>
  )
}

function LoadedTodos({
  initial,
  store,
  children,
}: {
  initial: Todo[]
  store: RecordStore<Todo>
  children: ReactNode
}) {
  const [todos, dispatch] = useReducer(todoReducer, initial)
  const saved = useRef(initial)

  // Writes only the todos that changed since the last save.
  useEffect(() => {
    void store.sync(saved.current, todos)
    saved.current = todos
  }, [todos, store])

  return <TodoContext value={{ todos, dispatch }}>{children}</TodoContext>
}
