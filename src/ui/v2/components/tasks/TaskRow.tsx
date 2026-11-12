import { Pencil, Timer, Trash2 } from 'lucide-react'
import { motion } from 'motion/react'
import { useState, type FormEvent, type KeyboardEvent } from 'react'
import { MAX_LENGTH } from '../../../../lib/limits.ts'
import { usePomodoro } from '../../../../state/usePomodoro.ts'
import { useTodos } from '../../../../state/useTodos.ts'
import type { Todo } from '../../../../types/todo.ts'
import { navigate } from '../../lib/router.ts'
import { useAppSettings } from '../../state/appContext.ts'
import { IconButton } from '../Button.tsx'
import { useToast } from '../toastContext.ts'

interface TaskRowProps {
  todo: Todo
  /** Past days are read-only apart from ticking. */
  editable?: boolean
  onCompleted?: () => void
}

export function TaskRow({ todo, editable = true, onCompleted }: TaskRowProps) {
  const { dispatch } = useTodos()
  const { settings } = useAppSettings()
  const { timer, setTask } = usePomodoro()
  const toast = useToast()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(todo.title)
  const focused = timer.taskId === todo.id && timer.status !== 'idle'

  function toggle() {
    dispatch({ type: 'toggle', id: todo.id })
    if (!todo.done) onCompleted?.()
  }

  function remove() {
    dispatch({ type: 'delete', id: todo.id })
    toast({
      message: `Deleted “${todo.title.length > 40 ? todo.title.slice(0, 40) + '…' : todo.title}”`,
      action: { label: 'Undo', run: () => dispatch({ type: 'add', todo }) },
    })
  }

  function save(event?: FormEvent) {
    event?.preventDefault()
    const title = draft.trim()
    if (title && title !== todo.title)
      dispatch({ type: 'rename', id: todo.id, title })
    else setDraft(todo.title)
    setEditing(false)
  }

  function handleKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Escape') {
      setDraft(todo.title)
      setEditing(false)
    }
  }

  function focusOn() {
    setTask({ id: todo.id, title: todo.title })
    navigate('focus')
  }

  return (
    <motion.li
      layout
      className={`task ${todo.done ? 'is-done' : ''} ${focused ? 'is-focused' : ''}`}
      initial={{ opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -24, transition: { duration: 0.18 } }}
      transition={{ type: 'spring', stiffness: 500, damping: 40 }}
    >
      <button
        type="button"
        className="check"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={todo.title}
        onClick={toggle}
        disabled={!editable}
      >
        <svg viewBox="0 0 20 20" aria-hidden="true">
          <motion.circle
            cx="10"
            cy="10"
            r="8.5"
            className="check__fill"
            initial={false}
            animate={{ scale: todo.done ? 1 : 0, opacity: todo.done ? 1 : 0 }}
            transition={{ type: 'spring', stiffness: 600, damping: 30 }}
          />
          <motion.path
            d="M6 10.4 8.7 13 14 7.5"
            className="check__mark"
            initial={false}
            animate={{
              pathLength: todo.done ? 1 : 0,
              opacity: todo.done ? 1 : 0,
            }}
            transition={{ duration: 0.25, delay: todo.done ? 0.08 : 0 }}
          />
        </svg>
      </button>

      {editing ? (
        <form className="task__edit" onSubmit={save}>
          <input
            autoFocus
            value={draft}
            maxLength={MAX_LENGTH.title}
            aria-label="Task name"
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => save()}
            onKeyDown={handleKey}
          />
        </form>
      ) : (
        <span
          className="task__title"
          onDoubleClick={editable ? () => setEditing(true) : undefined}
        >
          {/* The strike-through is a background that sweeps across each line (CSS). */}
          <span className="task__text">{todo.title}</span>
        </span>
      )}

      {focused && <span className="task__badge">In focus</span>}

      {!editing && (
        <span className="task__actions">
          {settings.pomodoro && !todo.done && editable && (
            <IconButton label="Focus on this task" size="sm" onClick={focusOn}>
              <Timer size={16} aria-hidden="true" />
            </IconButton>
          )}
          {editable && (
            <IconButton
              label="Rename task"
              size="sm"
              onClick={() => setEditing(true)}
            >
              <Pencil size={15} aria-hidden="true" />
            </IconButton>
          )}
          {editable && (
            <IconButton
              label="Delete task"
              size="sm"
              variant="ghost"
              className="task__delete"
              onClick={remove}
            >
              <Trash2 size={16} aria-hidden="true" />
            </IconButton>
          )}
        </span>
      )}
    </motion.li>
  )
}
