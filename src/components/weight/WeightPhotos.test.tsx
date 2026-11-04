import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { toDateKey } from '../../lib/date.ts'
import { MAX_PHOTOS_PER_DAY } from '../../lib/limits.ts'
import { WeightProvider } from '../../state/WeightContext.tsx'
import { WeightPanel } from './WeightPanel.tsx'

// jsdom can't decode images and fake-indexeddb can't store its Blobs, so the
// photo store is an in-memory map and resizing passes the file through.
const stored = vi.hoisted(() => new Map<string, Blob>())
vi.mock('../../lib/photos.ts', async (actual) => ({
  ...(await actual<typeof import('../../lib/photos.ts')>()),
  resizePhoto: async (file: Blob) => file,
  savePhoto: async (key: string, photo: Blob) => void stored.set(key, photo),
  loadPhoto: async (key: string) => stored.get(key),
  loadThumbnail: async (key: string) => stored.get(key),
  deletePhotos: async (keys: string[]) => keys.forEach((k) => stored.delete(k)),
  backfillThumbnails: async () => {},
}))

const today = toDateKey(new Date())
const file = (name: string) =>
  new File([name], `${name}.jpg`, { type: 'image/jpeg' })
const files = (count: number) =>
  Array.from({ length: count }, (_, i) => file(`photo-${i + 1}`))

beforeEach(() => {
  stored.clear()
  vi.stubGlobal('URL', {
    ...URL,
    createObjectURL: (blob: File) => `blob:${blob.name}`,
    revokeObjectURL() {},
  })
})
afterEach(() => vi.unstubAllGlobals())

function setup() {
  const user = userEvent.setup()
  const { container } = render(
    <WeightProvider>
      <WeightPanel selectedDate={today} today={today} unit="kg" />
    </WeightProvider>,
  )
  const panelInput = container.querySelector<HTMLInputElement>(
    '.weight > input[type="file"]',
  )!
  async function addPhotos(chosen: File[]) {
    await user.click(
      screen.getByRole('button', { name: 'Add photos for Today' }),
    )
    await user.upload(panelInput, chosen)
    await vi.waitFor(() =>
      expect(screen.queryByText(/^Saving photo/)).not.toBeInTheDocument(),
    )
  }
  return { user, container, addPhotos }
}

const savedLog = () =>
  JSON.parse(localStorage.getItem('todoapp.weight.v1') ?? '{}')

describe('several photos a day', () => {
  it('adds several at once and shows them as a 2 × 2 grid with a count', async () => {
    const { container, addPhotos } = setup()
    await addPhotos(files(5))

    const thumb = container.querySelector('.weight__thumb')!
    const cells = thumb.querySelectorAll('.photo-grid__cell')
    expect(cells).toHaveLength(4)
    expect(thumb.querySelector('.photo-grid')).toHaveClass('photo-grid--4')
    expect(thumb.querySelector('.photo-grid__more')).toHaveTextContent('+1')
    await vi.waitFor(() =>
      expect(cells[0].querySelector('img')).toHaveAttribute(
        'src',
        'blob:photo-1.jpg',
      ),
    )
    expect(savedLog()[today].photos).toHaveLength(5)
    expect(stored.size).toBe(5)
  })

  it('slides through the photos, and removing one shows the next', async () => {
    const { user, addPhotos } = setup()
    await addPhotos(files(3))
    await user.click(
      screen.getByRole('button', { name: 'Open 3 photos for Today' }),
    )

    const dialog = screen.getByRole('dialog', { name: 'Photo for Today' })
    const image = () =>
      within(dialog).findByRole('img', { name: /^Photo \d of/ })
    expect(await image()).toHaveAccessibleName('Photo 1 of 3 for Today')
    expect(within(dialog).getByText('1 / 3')).toBeInTheDocument()
    expect(
      within(dialog).getByRole('button', { name: 'Previous photo' }),
    ).toBeDisabled()

    await user.click(within(dialog).getByRole('button', { name: 'Next photo' }))
    expect(await image()).toHaveAttribute('src', 'blob:photo-2.jpg')
    await user.keyboard('{ArrowRight}')
    expect(await image()).toHaveAccessibleName('Photo 3 of 3 for Today')
    expect(
      within(dialog).getByRole('button', { name: 'Next photo' }),
    ).toBeDisabled()

    // Removing the last one steps back to the one before it.
    await user.click(within(dialog).getByRole('button', { name: 'Remove' }))
    expect(await image()).toHaveAccessibleName('Photo 2 of 2 for Today')
    expect(await image()).toHaveAttribute('src', 'blob:photo-2.jpg')
    expect(savedLog()[today].photos).toHaveLength(2)
    await vi.waitFor(() => expect(stored.size).toBe(2))
  })

  it('replaces one photo in place', async () => {
    const { user, container, addPhotos } = setup()
    await addPhotos(files(2))
    const before = savedLog()[today].photos
    await user.click(
      screen.getByRole('button', { name: 'Open 2 photos for Today' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Photo for Today' })

    await user.click(within(dialog).getByRole('button', { name: 'Replace' }))
    const input = container.querySelector<HTMLInputElement>(
      '.weight > input[type="file"]',
    )!
    expect(input.multiple).toBe(false)
    await user.upload(input, file('new'))

    // The preview follows the new photo, in the first place.
    await vi.waitFor(() =>
      expect(
        within(dialog).getByRole('img', { name: 'Photo 1 of 2 for Today' }),
      ).toHaveAttribute('src', 'blob:new.jpg'),
    )
    const after = savedLog()[today].photos
    expect(after).toHaveLength(2)
    expect(after[0]).not.toBe(before[0])
    expect(after[1]).toBe(before[1])
    expect(stored.has(before[0])).toBe(false)
  })

  it(`keeps a day to ${MAX_PHOTOS_PER_DAY} photos`, async () => {
    const { addPhotos } = setup()
    await addPhotos(files(MAX_PHOTOS_PER_DAY - 2))
    await addPhotos(files(5)) // only 2 fit

    expect(savedLog()[today].photos).toHaveLength(MAX_PHOTOS_PER_DAY)
    expect(screen.getByRole('alert')).toHaveTextContent(
      `A day holds up to ${MAX_PHOTOS_PER_DAY} photos, so 3 were not added.`,
    )
    // Full: no more adding.
    expect(
      screen.queryByRole('button', { name: 'Add photos for Today' }),
    ).not.toBeInTheDocument()
  })

  it('keeps the photo of a day saved when there was one per day', async () => {
    stored.set(today, file('old'))
    localStorage.setItem(
      'todoapp.weight.v1',
      JSON.stringify({ [today]: { kg: 72, hasPhoto: true } }),
    )
    const { user } = setup()
    await act(async () => {})
    await user.click(
      screen.getByRole('button', { name: 'Open photo for Today' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Photo for Today' })
    expect(
      await within(dialog).findByRole('img', { name: 'Photo for Today' }),
    ).toHaveAttribute('src', 'blob:old.jpg')
    expect(savedLog()[today]).toEqual({ kg: 72, photos: [today] })
  })
})
