import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from '../../App.tsx'

beforeEach(() => {
  location.hash = '#/settings/backup'
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
  // jsdom has no layout; Settings scrolls to the section it opens at.
  Element.prototype.scrollIntoView ??= () => {}
})

async function openBackup() {
  render(<App />)
  return within(
    (await screen.findByRole('heading', { name: 'Backup' })).closest(
      '.card',
    ) as HTMLElement,
  )
}

const backupFile = (text: string) =>
  new File([text], 'todo-backup.json', { type: 'application/json' })

describe('Backup settings', () => {
  it('exports the data as a JSON file', async () => {
    const created: Blob[] = []
    URL.createObjectURL = vi.fn((blob: Blob) => {
      created.push(blob)
      return 'blob:backup'
    })
    URL.revokeObjectURL = vi.fn()
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {})
    const user = userEvent.setup()
    const card = await openBackup()

    await user.click(card.getByRole('button', { name: 'Export' }))

    await vi.waitFor(() => expect(click).toHaveBeenCalledOnce())
    const link = click.mock.contexts[0] as HTMLAnchorElement
    expect(link.download).toMatch(/^todo-backup-\d{4}-\d\d-\d\d\.json$/)
    const exported = JSON.parse(await created[0].text())
    expect(exported.app).toBe('todoapp')
    expect(exported.todos.length).toBeGreaterThan(0)
    click.mockRestore()
  })

  it('shows what a file holds and imports it after confirming', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...location, reload, hash: location.hash })
    const user = userEvent.setup()
    const card = await openBackup()

    const file = backupFile(
      JSON.stringify({
        app: 'todoapp',
        format: 1,
        createdAt: '2026-11-01T08:00:00.000Z',
        local: { 'todoapp.settings.v1': { theme: 'dark' } },
        todos: [
          {
            id: 'a',
            title: 'From the file',
            done: false,
            date: '2026-11-01',
            createdAt: '2026-11-01T08:00:00.000Z',
          },
        ],
        sessions: [],
      }),
    )
    await user.upload(card.getByLabelText('Backup file to import'), file)

    const dialog = await screen.findByRole('dialog', {
      name: 'Import this backup?',
    })
    expect(within(dialog).getByText('Tasks').nextSibling).toHaveTextContent('1')
    await user.click(
      within(dialog).getByRole('button', { name: 'Replace my data' }),
    )
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce())
    expect(JSON.parse(localStorage.getItem('todoapp.todos.v2')!)).toEqual([
      expect.objectContaining({ title: 'From the file' }),
    ])
    expect(JSON.parse(localStorage.getItem('todoapp.settings.v1')!)).toEqual({
      theme: 'dark',
    })
    vi.unstubAllGlobals()
  })

  it('says when a file isn’t a backup', async () => {
    const user = userEvent.setup()
    const card = await openBackup()
    await user.upload(
      card.getByLabelText('Backup file to import'),
      backupFile('{"hello": 1}'),
    )
    expect(
      await screen.findByText('This isn’t a To-do backup.'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
