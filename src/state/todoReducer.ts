import type { Todo } from '../types/todo.ts'

export type TodoAction =
  | { type: 'add'; todo: Todo }
  | { type: 'toggle'; id: string }
  | { type: 'delete'; id: string }

export function todoReducer(todos: Todo[], action: TodoAction): Todo[] {
  switch (action.type) {
    case 'add':
      return [...todos, action.todo]
    case 'toggle':
      return todos.map((todo) =>
        todo.id === action.id ? { ...todo, done: !todo.done } : todo,
      )
    case 'delete':
      return todos.filter((todo) => todo.id !== action.id)
  }
}

// Kept outside the reducer so the reducer stays pure (no random ids / clock).
export function createTodo(title: string): Todo {
  return {
    id: crypto.randomUUID(),
    title,
    done: false,
    createdAt: new Date().toISOString(),
  }
}

export function sampleTodos(): Todo[] {
  return [
    { ...createTodo('Sketch out the to-do app'), done: true },
    createTodo('Try ticking this box'),
    createTodo('Add something of your own above'),
  ]
}
