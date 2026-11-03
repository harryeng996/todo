import { relativeDayLabel, type DateKey } from '../../lib/date.ts'
import { useTodos } from '../../state/useTodos.ts'
import { SketchButton } from '../sketch/SketchButton.tsx'
import { SketchUnderline } from '../sketch/SketchUnderline.tsx'
import { TodoInput } from './TodoInput.tsx'
import { TodoList } from './TodoList.tsx'
import { TodoStats } from './TodoStats.tsx'

interface TodoPanelProps {
  selectedDate: DateKey
  today: DateKey
  onBackToToday: () => void
}

/** The selected day's list. Only today is editable; past days are read-only. */
export function TodoPanel({
  selectedDate,
  today,
  onBackToToday,
}: TodoPanelProps) {
  const { todos } = useTodos()
  const dayTodos = todos.filter((todo) => todo.date === selectedDate)
  const remaining = dayTodos.filter((todo) => !todo.done).length
  const editable = selectedDate === today

  return (
    <section className="todo-panel" aria-labelledby="todo-panel-heading">
      <header className="todo-panel__header">
        <h2 id="todo-panel-heading" className="todo-panel__heading">
          <SketchUnderline seed={7}>
            {relativeDayLabel(selectedDate, today)}
          </SketchUnderline>
        </h2>
        {editable ? (
          <p className="todo-panel__count">
            {remaining} of {dayTodos.length} left
          </p>
        ) : (
          <p className="todo-panel__readonly">
            <span className="todo-panel__tag">read-only</span>
            <SketchButton variant="ghost" onClick={onBackToToday}>
              back to today
            </SketchButton>
          </p>
        )}
      </header>
      {editable && <TodoInput date={today} />}
      <TodoList todos={dayTodos} editable={editable} />
      <TodoStats selectedDate={selectedDate} today={today} />
    </section>
  )
}
