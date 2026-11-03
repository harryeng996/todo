import { describe, expect, it } from 'vitest'
import { createTodo, todoReducer } from './todoReducer.ts'

describe('todoReducer', () => {
  const milk = createTodo('Buy milk', '2026-11-03')

  it('adds a todo to the end', () => {
    const bread = createTodo('Buy bread', '2026-11-03')
    expect(todoReducer([milk], { type: 'add', todo: bread })).toEqual([
      milk,
      bread,
    ])
  })

  it('toggles done', () => {
    const [toggled] = todoReducer([milk], { type: 'toggle', id: milk.id })
    expect(toggled.done).toBe(true)
    expect(milk.done).toBe(false)
  })

  it('deletes by id', () => {
    expect(todoReducer([milk], { type: 'delete', id: milk.id })).toEqual([])
  })
})
