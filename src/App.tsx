import { NotebookPen } from 'lucide-react'
import { SketchBox } from './components/sketch/SketchBox.tsx'
import { SketchUnderline } from './components/sketch/SketchUnderline.tsx'
import { TodoInput } from './components/todo/TodoInput.tsx'
import { TodoList } from './components/todo/TodoList.tsx'
import { TodoProvider } from './state/TodoContext.tsx'
import { useTodos } from './state/useTodos.ts'

function Page() {
  const { todos } = useTodos()
  const remaining = todos.filter((todo) => !todo.done).length

  return (
    <main className="page">
      <header className="page__header">
        <h1 className="page__title">
          <NotebookPen size={32} strokeWidth={1.75} aria-hidden="true" />
          <SketchUnderline seed={7}>To-do</SketchUnderline>
        </h1>
        <p className="page__count">
          {remaining} of {todos.length} left
        </p>
      </header>
      <SketchBox seed={42}>
        <TodoInput />
        <TodoList />
      </SketchBox>
    </main>
  )
}

export default function App() {
  return (
    <TodoProvider>
      <Page />
    </TodoProvider>
  )
}
