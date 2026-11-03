import { useEffect, useReducer, type ReactNode } from 'react'
import type { JsonStore } from '../lib/storage.ts'
import type { Todo } from '../types/todo.ts'
import { todoReducer } from './todoReducer.ts'
import { todoStore } from './todoStore.ts'
import { TodoContext } from './useTodos.ts'

interface TodoProviderProps {
  children: ReactNode
  store?: JsonStore<Todo[]>
}

export function TodoProvider({
  children,
  store = todoStore,
}: TodoProviderProps) {
  const [todos, dispatch] = useReducer(todoReducer, store, (s) => s.load())

  useEffect(() => {
    store.save(todos)
  }, [todos, store])

  return <TodoContext value={{ todos, dispatch }}>{children}</TodoContext>
}
