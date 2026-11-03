import { X } from 'lucide-react'
import { useTodos } from '../../state/useTodos.ts'
import type { Todo } from '../../types/todo.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchCheckbox } from '../sketch/SketchCheckbox.tsx'
import { SketchStrike } from '../sketch/SketchStrike.tsx'
import { seedFrom } from '../sketch/useRough.ts'

interface TodoItemProps {
  todo: Todo
  editable: boolean
}

export function TodoItem({ todo, editable }: TodoItemProps) {
  const { dispatch } = useTodos()
  const seed = seedFrom(todo.id)

  return (
    <li className={todo.done ? 'todo-item todo-item--done' : 'todo-item'}>
      <SketchCheckbox
        checked={todo.done}
        onChange={() => dispatch({ type: 'toggle', id: todo.id })}
        label={todo.title}
        disabled={!editable}
        seed={seed}
      />
      <span className="todo-item__title">
        <SketchStrike active={todo.done} seed={seed}>
          {todo.title}
        </SketchStrike>
      </span>
      {editable && (
        <SketchButton
          variant="ghost"
          className="todo-item__delete"
          onClick={() => dispatch({ type: 'delete', id: todo.id })}
          aria-label={`Delete "${todo.title}"`}
        >
          <X size={20} strokeWidth={1.75} aria-hidden="true" />
        </SketchButton>
      )}
    </li>
  )
}
