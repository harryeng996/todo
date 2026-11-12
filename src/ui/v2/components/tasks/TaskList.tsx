import { ChevronDown } from 'lucide-react'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { useState } from 'react'
import type { Todo } from '../../../../types/todo.ts'
import { TaskRow } from './TaskRow.tsx'

const byCreated = (a: Todo, b: Todo) => (a.createdAt < b.createdAt ? -1 : 1)

interface TaskListProps {
  todos: readonly Todo[]
  editable?: boolean
  empty: string
  /** Show at most this many open tasks (Home). */
  limit?: number
  onCompleted?: (remainingOpen: number) => void
  showCompleted?: boolean
}

/** Open tasks first; finished ones slide into a collapsible "Completed" group. */
export function TaskList({
  todos,
  editable = true,
  empty,
  limit,
  onCompleted,
  showCompleted = true,
}: TaskListProps) {
  const [completedOpen, setCompletedOpen] = useState(true)
  const open = todos.filter((t) => !t.done).sort(byCreated)
  const done = todos.filter((t) => t.done).sort(byCreated)
  const shown = limit ? open.slice(0, limit) : open

  if (todos.length === 0) {
    return (
      <motion.p
        className="empty"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        {empty}
      </motion.p>
    )
  }

  return (
    <LayoutGroup>
      <ul className="tasks">
        <AnimatePresence initial={false} mode="popLayout">
          {shown.map((todo) => (
            <TaskRow
              key={todo.id}
              todo={todo}
              editable={editable}
              onCompleted={() => onCompleted?.(open.length - 1)}
            />
          ))}
        </AnimatePresence>
      </ul>
      {limit && open.length > limit && (
        <p className="tasks__more">+{open.length - limit} more open</p>
      )}
      {open.length === 0 && (
        <motion.p
          className="tasks__all-done"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          All done for this day ✨
        </motion.p>
      )}
      {showCompleted && done.length > 0 && (
        <motion.div layout className="tasks__completed">
          <button
            type="button"
            className="tasks__completed-toggle"
            aria-expanded={completedOpen}
            onClick={() => setCompletedOpen((o) => !o)}
          >
            <motion.span
              animate={{ rotate: completedOpen ? 0 : -90 }}
              className="tasks__chevron"
            >
              <ChevronDown size={16} aria-hidden="true" />
            </motion.span>
            Completed <span className="tasks__count num">{done.length}</span>
          </button>
          <AnimatePresence initial={false}>
            {completedOpen && (
              <motion.ul
                className="tasks"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                style={{ overflow: 'hidden' }}
              >
                <AnimatePresence initial={false} mode="popLayout">
                  {done.map((todo) => (
                    <TaskRow key={todo.id} todo={todo} editable={editable} />
                  ))}
                </AnimatePresence>
              </motion.ul>
            )}
          </AnimatePresence>
        </motion.div>
      )}
    </LayoutGroup>
  )
}
