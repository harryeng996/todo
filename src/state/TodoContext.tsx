import { useEffect, useReducer, type ReactNode } from 'react'
import { localStorageRepository, type TodoRepository } from '../lib/storage.ts'
import { sampleTodos, todoReducer } from './todoReducer.ts'
import { TodoContext } from './useTodos.ts'

interface TodoProviderProps {
  children: ReactNode
  repository?: TodoRepository
}

export function TodoProvider({
  children,
  repository = localStorageRepository,
}: TodoProviderProps) {
  const [todos, dispatch] = useReducer(
    todoReducer,
    repository,
    (repo) => repo.load() ?? sampleTodos(),
  )

  useEffect(() => {
    repository.save(todos)
  }, [todos, repository])

  return <TodoContext value={{ todos, dispatch }}>{children}</TodoContext>
}
