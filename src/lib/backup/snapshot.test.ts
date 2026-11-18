import 'fake-indexeddb/auto'
import { clear, createStore } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import { sessionRecords } from '../../state/sessionStore.ts'
import { todoRecords } from '../../state/todoStore.ts'
import type { Todo } from '../../types/todo.ts'
import {
  applySnapshot,
  collectSnapshot,
  forgetSupabaseBackup,
  photoKeysOf,
  readSnapshot,
} from './snapshot.ts'

const todo = (id: string, title: string): Todo => ({
  id,
  title,
  done: false,
  date: '2026-11-18',
  createdAt: '2026-11-18T10:00:00.000Z',
})

const session = (id: string, end: number) => ({
  id,
  start: end - 25 * 60_000,
  end,
  date: '2026-11-18',
  minutes: 25,
  taskId: null,
  taskTitle: null,
})

// One database per list for the whole file (the stores keep their connections).
beforeEach(async () => {
  await Promise.all(
    ['todoapp-todos', 'todoapp-focus-sessions'].map((db) =>
      clear(createStore(db, 'records')),
    ),
  )
  await todoRecords.replaceAll([])
  await sessionRecords.replaceAll([])
})

async function seed() {
  await todoRecords.replaceAll([todo('t1', 'Water plants')])
  await sessionRecords.replaceAll([session('s1', 1_700_000_000_000)])
  localStorage.setItem('todoapp.settings.v1', JSON.stringify({ theme: 'dark' }))
  localStorage.setItem(
    'todoapp.weight.v1',
    JSON.stringify({ '2026-11-18': { kg: 70, photos: ['2026-11-18~a'] } }),
  )
  localStorage.setItem('todoapp.pomodoro.timer.v1', JSON.stringify({ x: 1 }))
  localStorage.setItem(
    'todoapp.backup.v1',
    JSON.stringify({ connection: { apiKey: 'secret' } }),
  )
  localStorage.setItem('someone-else', 'untouched')
}

describe('backup file', () => {
  it('holds the lists and the app’s settings, not this device’s own keys', async () => {
    await seed()
    const now = new Date('2026-11-18T09:05:07.123Z')
    const snapshot = await collectSnapshot(now)

    expect(snapshot.createdAt).toBe('2026-11-18T09:05:07.123Z')
    expect(snapshot.todos.map((t) => t.title)).toEqual(['Water plants'])
    expect(snapshot.sessions).toHaveLength(1)
    expect(Object.keys(snapshot.local).sort()).toEqual([
      'todoapp.settings.v1',
      'todoapp.weight.v1',
    ])
    expect(JSON.stringify(snapshot)).not.toContain('secret')
    expect(photoKeysOf(snapshot)).toEqual(['2026-11-18~a'])
  })

  it('imports by replacing the data, keeping a running timer', async () => {
    await seed()
    const text = JSON.stringify(await collectSnapshot())

    // Changed since the export.
    await todoRecords.replaceAll([todo('t2', 'Something else')])
    await sessionRecords.replaceAll([])
    localStorage.setItem(
      'todoapp.settings.v1',
      JSON.stringify({ theme: 'light' }),
    )
    localStorage.setItem('todoapp.quotes.v2', JSON.stringify({ i: 3 }))

    await applySnapshot(readSnapshot(text))

    expect((await todoRecords.load()).map((t) => t.title)).toEqual([
      'Water plants',
    ])
    expect(await sessionRecords.load()).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('todoapp.settings.v1')!)).toEqual({
      theme: 'dark',
    })
    expect(localStorage.getItem('todoapp.quotes.v2')).toBeNull() // not in the file
    expect(localStorage.getItem('todoapp.pomodoro.timer.v1')).not.toBeNull()
    expect(localStorage.getItem('someone-else')).toBe('untouched')
  })

  it('turns anything else into a readable error', () => {
    expect(() => readSnapshot('nope')).toThrow('isn’t JSON')
    expect(() => readSnapshot('{"app":"other"}')).toThrow(
      'isn’t a To-do backup',
    )
    expect(() => readSnapshot('{"app":"todoapp","format":99}')).toThrow(
      'newer version',
    )
    expect(() =>
      readSnapshot(
        '{"app":"todoapp","format":1,"createdAt":"x","local":{},"todos":[],"sessions":[]}',
      ),
    ).toThrow('damaged')
  })
})

describe('the removed Supabase backup', () => {
  it('leaves no API key behind', () => {
    localStorage.setItem(
      'todoapp.backup.v1',
      JSON.stringify({ connection: { apiKey: 'sb_publishable_abc' } }),
    )
    forgetSupabaseBackup()
    expect(localStorage.getItem('todoapp.backup.v1')).toBeNull()
  })
})
