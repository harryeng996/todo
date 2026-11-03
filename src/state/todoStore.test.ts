import { describe, expect, it } from 'vitest'
import { migrateV1, todoStore } from './todoStore.ts'

describe('todo storage', () => {
  it('migrates v1 todos to the local day they were created on', () => {
    // 23:30 UTC on 1 July is 00:30 on 2 July in London (BST).
    const [todo] = migrateV1([
      {
        id: '1',
        title: 'Old',
        done: true,
        createdAt: '2026-07-01T23:30:00.000Z',
      },
    ])
    expect(todo.date).toBe('2026-07-02')
  })

  it('loads v1 data when there is no v2 data yet', () => {
    localStorage.setItem(
      'todoapp.todos.v1',
      JSON.stringify([
        {
          id: '1',
          title: 'Old',
          done: false,
          createdAt: '2026-11-02T10:00:00.000Z',
        },
      ]),
    )
    expect(todoStore.load()).toEqual([
      {
        id: '1',
        title: 'Old',
        done: false,
        createdAt: '2026-11-02T10:00:00.000Z',
        date: '2026-11-02',
      },
    ])
  })

  it('starts with sample todos on a first visit', () => {
    expect(todoStore.load()).toHaveLength(3)
  })
})
