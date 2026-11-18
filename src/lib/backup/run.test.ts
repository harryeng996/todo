import 'fake-indexeddb/auto'
import { clear, createStore } from 'idb-keyval'
import { beforeEach, describe, expect, it } from 'vitest'
import { sessionRecords } from '../../state/sessionStore.ts'
import { todoRecords } from '../../state/todoStore.ts'
import { memoryBackup } from '../../test/memoryBackup.ts'
import type { Todo } from '../../types/todo.ts'
import { loadPhoto, savePhoto, storedPhotoKeys } from '../photos.ts'
import {
  KEEP_SNAPSHOTS,
  backUp,
  readSnapshot,
  restoreFromBackup,
} from './run.ts'
import { BACKUP_CONFIG_KEY } from './snapshot.ts'

// jsdom's Blob can't be stored by fake-indexeddb, so strings stand in for images.
const blob = (name: string) => name as unknown as Blob

const todo = (id: string, title: string): Todo => ({
  id,
  title,
  done: false,
  date: '2026-11-18',
  createdAt: `2026-11-18T10:00:0${id.length}.000Z`,
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
    [
      ['todoapp-todos', 'records'],
      ['todoapp-focus-sessions', 'records'],
      ['todoapp-photos', 'photos'],
    ].map(([db, store]) => clear(createStore(db, store))),
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
  localStorage.setItem(
    BACKUP_CONFIG_KEY,
    JSON.stringify({ connection: { apiKey: 'secret' } }),
  )
  localStorage.setItem('todoapp.pomodoro.timer.v1', JSON.stringify({ x: 1 }))
  localStorage.setItem('someone-else', 'untouched')
  await savePhoto('2026-11-18~a', blob('photo-a'), blob('thumb-a'))
}

describe('backing up', () => {
  it('uploads the data and new photos, never the backup settings', async () => {
    await seed()
    const bucket = memoryBackup()
    const now = new Date('2026-11-18T09:05:07.123Z')
    const result = await backUp(bucket.provider, { includePhotos: true, now })

    expect(result).toEqual({
      name: '2026-11-18T09-05-07-123Z.json',
      photosUploaded: 1,
    })
    expect(bucket.photos.get('2026-11-18~a')).toBe('photo-a')
    const saved = bucket.snapshots.get(result.name)!
    expect(saved).not.toContain('secret')
    const snapshot = readSnapshot(saved)
    expect(snapshot.todos.map((t) => t.title)).toEqual(['Water plants'])
    expect(snapshot.sessions).toHaveLength(1)
    expect(Object.keys(snapshot.local).sort()).toEqual([
      'todoapp.settings.v1',
      'todoapp.weight.v1',
    ])
  })

  it('sends each photo once, and skips photos when asked', async () => {
    await seed()
    const bucket = memoryBackup()
    await backUp(bucket.provider, { includePhotos: true })
    const again = await backUp(bucket.provider, {
      includePhotos: true,
      now: new Date(Date.now() + 1000),
    })
    expect(again.photosUploaded).toBe(0)
    expect(bucket.uploads).toEqual(['2026-11-18~a'])

    const other = memoryBackup()
    await backUp(other.provider, { includePhotos: false })
    expect(other.photos.size).toBe(0)
  })

  it(`keeps the newest ${KEEP_SNAPSHOTS} backups`, async () => {
    const bucket = memoryBackup()
    const start = Date.parse('2026-01-01T00:00:00Z')
    for (let day = 0; day < KEEP_SNAPSHOTS + 3; day++)
      await backUp(bucket.provider, {
        includePhotos: false,
        now: new Date(start + day * 86_400_000),
      })
    const names = [...bucket.snapshots.keys()].sort()
    expect(names).toHaveLength(KEEP_SNAPSHOTS)
    expect(names[0]).toBe('2026-01-04T00-00-00-000Z.json')
  })
})

describe('restoring', () => {
  it('replaces the data, brings photos back and keeps this device’s settings', async () => {
    await seed()
    const bucket = memoryBackup()
    const { name } = await backUp(bucket.provider, { includePhotos: true })

    // A different browser: other data, no photos.
    await clear(createStore('todoapp-photos', 'photos'))
    await todoRecords.replaceAll([todo('t2', 'Something else')])
    await sessionRecords.replaceAll([])
    localStorage.setItem(
      'todoapp.settings.v1',
      JSON.stringify({ theme: 'light' }),
    )
    localStorage.setItem('todoapp.quotes.v2', JSON.stringify({ i: 3 }))

    const result = await restoreFromBackup(bucket.provider, name)

    expect(result).toEqual({ photosRestored: 1, photosMissing: 0 })
    expect((await todoRecords.load()).map((t) => t.title)).toEqual([
      'Water plants',
    ])
    expect(await sessionRecords.load()).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem('todoapp.settings.v1')!)).toEqual({
      theme: 'dark',
    })
    // Not in the backup, so gone; the device's own keys stay.
    expect(localStorage.getItem('todoapp.quotes.v2')).toBeNull()
    expect(localStorage.getItem(BACKUP_CONFIG_KEY)).toContain('secret')
    expect(localStorage.getItem('todoapp.pomodoro.timer.v1')).not.toBeNull()
    expect(localStorage.getItem('someone-else')).toBe('untouched')
    expect(await loadPhoto('2026-11-18~a')).toBe('photo-a')
  })

  it('counts photos the bucket doesn’t have', async () => {
    await seed()
    const bucket = memoryBackup()
    const { name } = await backUp(bucket.provider, { includePhotos: false })
    await clear(createStore('todoapp-photos', 'photos'))
    const result = await restoreFromBackup(bucket.provider, name)
    expect(result).toEqual({ photosRestored: 0, photosMissing: 1 })
    expect(await storedPhotoKeys()).toEqual(new Set())
  })

  it('leaves the data alone when a photo can’t be downloaded', async () => {
    await seed()
    const bucket = memoryBackup()
    const { name } = await backUp(bucket.provider, { includePhotos: true })
    await clear(createStore('todoapp-photos', 'photos'))
    await todoRecords.replaceAll([todo('t2', 'Still here')])
    bucket.provider.getPhoto = () => Promise.reject(new Error('offline'))

    await expect(restoreFromBackup(bucket.provider, name)).rejects.toThrow(
      'offline',
    )
    expect((await todoRecords.load()).map((t) => t.title)).toEqual([
      'Still here',
    ])
  })
})

describe('reading a backup', () => {
  it('turns bad input into readable errors', () => {
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
