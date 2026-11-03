import { useTodos } from '../../state/useTodos.ts'
import { TodoItem } from './TodoItem.tsx'

export function TodoList() {
  const { todos } = useTodos()

  if (todos.length === 0) {
    return (
      <p className="todo-list__empty">Nothing here yet. Add something above.</p>
    )
  }

  return (
    <ul className="todo-list">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  )
}
