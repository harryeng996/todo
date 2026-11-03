import { createContext, useContext, type Dispatch } from 'react'
import type { Todo } from '../types/todo.ts'
import type { TodoAction } from './todoReducer.ts'

interface TodoContextValue {
  todos: Todo[]
  dispatch: Dispatch<TodoAction>
}

// Lives apart from <TodoProvider> so that file only exports components (fast refresh).
export const TodoContext = createContext<TodoContextValue | null>(null)

export function useTodos(): TodoContextValue {
  const value = useContext(TodoContext)
  if (!value) throw new Error('useTodos must be used inside <TodoProvider>')
  return value
}
