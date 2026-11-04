import 'fake-indexeddb/auto'
import { IDBFactory } from 'fake-indexeddb'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createRecordStore } from './recordStore.ts'
import { createJsonStore } from './storage.ts'

interface Item {
  id: string
  n: number
}

const LEGACY = 'test.items.v1'

function makeStore(dbName = 'test-items') {
  return createRecordStore<Item>({
    dbName,
    legacy: createJsonStore<Item[]>(LEGACY, () => [{ id: 'sample', n: 0 }]),
    legacyKeys: [LEGACY],
    compare: (a, b) => a.n - b.n,
  })
}

beforeEach(() => {
  // A fresh, empty IndexedDB for each test.
  globalThis.indexedDB = new IDBFactory()
})

describe('record store (IndexedDB)', () => {
  it('copies the localStorage list over once and removes it', async () => {
    localStorage.setItem(
      LEGACY,
      JSON.stringify([
        { id: 'b', n: 2 },
        { id: 'a', n: 1 },
      ]),
    )
    const store = makeStore()
    expect(store.loadNow()).toBeUndefined()
    expect(await store.load()).toEqual([
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
    ])
    expect(localStorage.getItem(LEGACY)).toBeNull()

    // A new page load reads IndexedDB, not the (now empty) localStorage.
    expect(await makeStore().load()).toEqual([
      { id: 'a', n: 1 },
      { id: 'b', n: 2 },
    ])
  })

  it('starts from the first-visit default, and stays empty once emptied', async () => {
    const store = makeStore()
    const first = await store.load()
    expect(first).toEqual([{ id: 'sample', n: 0 }])
    await store.sync(first, [])
    expect(await makeStore().load()).toEqual([])
  })

  it('writes only added, changed and removed records', async () => {
    const store = makeStore()
    const a = { id: 'a', n: 1 }
    const b = { id: 'b', n: 2 }
    const before = [...(await store.load()), a, b]
    await store.sync(await store.load(), before)

    const put = vi.spyOn(IDBObjectStore.prototype, 'put')
    const del = vi.spyOn(IDBObjectStore.prototype, 'delete')
    const c = { id: 'c', n: 3 }
    const changedA = { ...a, n: 4 }
    await store.sync(
      before,
      [changedA, b, c].filter((x) => x.id !== 'sample'),
    )
    expect(put.mock.calls.map(([value]) => (value as Item).id).sort()).toEqual([
      'a',
      'c',
    ])
    expect(del.mock.calls.map(([key]) => key)).toEqual(['sample'])
    put.mockRestore()
    del.mockRestore()

    expect(await makeStore().load()).toEqual([b, c, changedA])
  })

  it('does the first copy once when loaded twice at the same time', async () => {
    const store = makeStore()
    const [one, two] = await Promise.all([store.load(), store.load()])
    expect(one).toEqual(two)
    expect(await makeStore().load()).toHaveLength(1)
  })
})

describe('record store without IndexedDB', () => {
  it('keeps using the localStorage list', async () => {
    // @ts-expect-error simulating a browser without IndexedDB
    delete globalThis.indexedDB
    const store = makeStore()
    const items = store.loadNow()!
    expect(items).toEqual([{ id: 'sample', n: 0 }])
    await store.sync(items, [...items, { id: 'x', n: 5 }])
    expect(JSON.parse(localStorage.getItem(LEGACY)!)).toHaveLength(2)
  })
})
