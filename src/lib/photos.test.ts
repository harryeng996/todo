import 'fake-indexeddb/auto'
import { clear, createStore, get, set } from 'idb-keyval'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  backfillThumbnails,
  deletePhotos,
  newPhotoKey,
  loadPhoto,
  loadThumbnail,
  resetBackfill,
  savePhoto,
} from './photos.ts'

// jsdom's Blob can't be stored by fake-indexeddb, so strings stand in for
// images.
const blob = (name: string) => name as unknown as Blob
const db = () => createStore('todoapp-photos', 'photos')

// One database for the whole file (photos.ts keeps its connection open).
beforeEach(async () => {
  await clear(db())
  resetBackfill()
})

describe('photo storage', () => {
  it('saves a photo with its thumbnail and deletes both', async () => {
    const a = newPhotoKey('2026-11-01')
    const b = newPhotoKey('2026-11-01')
    expect(a).not.toBe(b)
    expect(a.startsWith('2026-11-01~')).toBe(true)
    await savePhoto(a, blob('full-a'), blob('thumb-a'))
    await savePhoto(b, blob('full-b'), blob('thumb-b'))
    expect(await loadPhoto(a)).toBe('full-a')
    expect(await loadThumbnail(b)).toBe('thumb-b')

    await deletePhotos([a, b])
    expect(await loadPhoto(a)).toBeUndefined()
    expect(await loadThumbnail(a)).toBeUndefined()
    expect(await loadPhoto(b)).toBeUndefined()
  })

  it('shows the full photo when an older one has no thumbnail and none can be made', async () => {
    // jsdom can't decode images, so resizing fails.
    await set('2026-10-01', 'old-full', db())
    expect(await loadThumbnail('2026-10-01')).toBe('old-full')
  })
})

describe('making missing thumbnails', () => {
  // A fake image pipeline: each encode yields 'thumb-<n>', and can be held.
  let encodes = 0
  let hold: Promise<void> | null = null
  beforeEach(() => {
    encodes = 0
    hold = null
    vi.stubGlobal('createImageBitmap', async () => ({
      width: 1600,
      height: 1200,
      close() {},
    }))
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
      drawImage() {},
    } as unknown as CanvasRenderingContext2D)
    vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
      function (callback) {
        const name = `thumb-${++encodes}`
        void (hold ?? Promise.resolve()).then(() => callback(blob(name)))
      },
    )
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('makes one on demand, once, even when asked twice at the same time', async () => {
    await set('2026-10-01', 'old-full', db())
    const [a, b] = await Promise.all([
      loadThumbnail('2026-10-01'),
      loadThumbnail('2026-10-01'),
    ])
    expect(a).toBe('thumb-1')
    expect(b).toBe('thumb-1')
    expect(encodes).toBe(1)
    expect(await get('thumb:2026-10-01', db())).toBe('thumb-1')
  })

  it('backfills older photos in the background, once', async () => {
    await set('2026-10-01', 'old-1', db())
    await set('2026-10-02', 'old-2', db())
    await savePhoto('2026-10-03', blob('new'), blob('new-thumb'))

    await backfillThumbnails()
    expect(await get('thumb:2026-10-01', db())).toMatch(/^thumb-/)
    expect(await get('thumb:2026-10-02', db())).toMatch(/^thumb-/)
    expect(await get('thumb:2026-10-03', db())).toBe('new-thumb')
    expect(encodes).toBe(2)

    // Done for good: a later page load doesn't scan again.
    resetBackfill()
    await set('2026-09-01', 'sneaked-in', db())
    await backfillThumbnails()
    expect(await get('thumb:2026-09-01', db())).toBeUndefined()
  })

  it('never overwrites the thumbnail of a photo replaced meanwhile', async () => {
    await set('2026-10-01', 'old-full', db())
    let release!: () => void
    hold = new Promise((r) => (release = r))

    const pending = loadThumbnail('2026-10-01') // made from the old photo…
    await vi.waitFor(() => expect(encodes).toBe(1))
    // …while the photo is replaced, with its own thumbnail.
    await savePhoto('2026-10-01', blob('new-full'), blob('new-thumb'))
    release()

    expect(await pending).toBe('new-thumb')
    expect(await get('thumb:2026-10-01', db())).toBe('new-thumb')
  })
})
