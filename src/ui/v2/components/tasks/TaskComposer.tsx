import { CornerDownLeft, Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState, type FormEvent } from 'react'
import type { DateKey } from '../../../../lib/date.ts'
import { MAX_LENGTH } from '../../../../lib/limits.ts'
import { createTodo } from '../../../../state/todoReducer.ts'
import { useTodos } from '../../../../state/useTodos.ts'

export function TaskComposer({
  date,
  autoFocus = false,
}: {
  date: DateKey
  autoFocus?: boolean
}) {
  const { dispatch } = useTodos()
  const [title, setTitle] = useState('')

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = title.trim()
    if (!trimmed) return
    dispatch({ type: 'add', todo: createTodo(trimmed, date) })
    setTitle('')
  }

  return (
    <form className="composer" onSubmit={submit}>
      <Plus size={18} className="composer__icon" aria-hidden="true" />
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Add a task…"
        aria-label="New to-do"
        maxLength={MAX_LENGTH.title}
        autoFocus={autoFocus}
      />
      <AnimatePresence>
        {title.trim() && (
          <motion.button
            type="submit"
            className="composer__submit"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            aria-label="Add task"
          >
            <CornerDownLeft size={14} aria-hidden="true" /> Add
          </motion.button>
        )}
      </AnimatePresence>
    </form>
  )
}
