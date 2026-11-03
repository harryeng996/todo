import { Plus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import type { DateKey } from '../../lib/date.ts'
import { useTodos } from '../../state/useTodos.ts'
import { createTodo } from '../../state/todoReducer.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchInput } from '../sketch/SketchInput.tsx'

export function TodoInput({ date }: { date: DateKey }) {
  const { dispatch } = useTodos()
  const [title, setTitle] = useState('')

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    dispatch({ type: 'add', todo: createTodo(trimmed, date) })
    setTitle('')
  }

  return (
    <form className="todo-input" onSubmit={handleSubmit}>
      <SketchInput
        value={title}
        onChange={(event) => setTitle(event.target.value)}
        placeholder="What needs doing?"
        aria-label="New to-do"
      />
      <SketchButton type="submit" variant="primary">
        <Plus size={20} strokeWidth={2} aria-hidden="true" />
        Add
      </SketchButton>
    </form>
  )
}
