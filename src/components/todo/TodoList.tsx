import type { Todo } from '../../types/todo.ts'
import { TodoItem } from './TodoItem.tsx'

interface TodoListProps {
  todos: Todo[]
  editable: boolean
}

export function TodoList({ todos, editable }: TodoListProps) {
  if (todos.length === 0) {
    return (
      <p className="todo-list__empty">
        {editable
          ? 'Nothing here yet. Add something above.'
          : 'Nothing was on the list this day.'}
      </p>
    )
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} editable={editable} />
      ))}
    </ul>
  )
}
