import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetBackupForTests } from '../../../../state/backup.ts'
import { memoryBackup } from '../../../../test/memoryBackup.ts'
import App from '../../App.tsx'

let bucket = memoryBackup()
let connectedWith: unknown = null

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
  bucket = memoryBackup()
  connectedWith = null
  resetBackupForTests((connection) => {
    connectedWith = connection
    return bucket.provider
  })
})

async function openBackup() {
  render(<App />)
  return within(
    (await screen.findByRole('heading', { name: 'Backup' })).closest(
      'section, .card',
    ) as HTMLElement,
  )
}

describe('Backup settings', () => {
  it('explains what is wrong with the form', async () => {
    const user = userEvent.setup()
    const card = await openBackup()
    await user.click(card.getByRole('button', { name: 'Connect' }))
    expect(card.getByRole('alert')).toHaveTextContent('Enter the project URL')

    await user.type(card.getByLabelText('Project URL'), 'abcd.supabase.co')
    await user.click(card.getByRole('button', { name: 'Connect' }))
    expect(card.getByRole('alert')).toHaveTextContent('anon or publishable key')
  })

  it('connects, backs up and restores', async () => {
    const reload = vi.fn()
    vi.stubGlobal('location', { ...location, reload, hash: location.hash })
    const user = userEvent.setup()
    const card = await openBackup()

    await user.type(card.getByLabelText('Project URL'), 'abcd.supabase.co/')
    await user.type(
      card.getByLabelText('API key (anon or publishable)'),
      'sb_publishable_abc',
    )
    await user.click(card.getByRole('button', { name: 'Show key' }))
    expect(
      card.getByLabelText('API key (anon or publishable)'),
    ).toHaveAttribute('type', 'text')
    await user.click(card.getByRole('button', { name: 'Connect' }))

    expect(
      await card.findByText('Connected to abcd.supabase.co'),
    ).toBeInTheDocument()
    expect(connectedWith).toEqual({
      url: 'https://abcd.supabase.co',
      apiKey: 'sb_publishable_abc',
      bucket: 'todoapp-backup',
    })
    expect(
      card.getByText('Not backed up from this browser yet.'),
    ).toBeInTheDocument()

    await user.click(card.getByRole('button', { name: 'Back up now' }))
    // The toast fades in from opacity 0, so only check it appeared.
    expect(await screen.findByText('Backed up')).toBeInTheDocument()
    expect(card.getByText(/Last backup just now/)).toBeInTheDocument()
    expect(bucket.snapshots.size).toBe(1)

    await user.click(card.getByRole('button', { name: 'Restore…' }))
    const dialog = await screen.findByRole('dialog', {
      name: 'Restore a backup',
    })
    expect(await within(dialog).findByRole('radio')).toBeChecked()
    await user.click(
      within(dialog).getByRole('button', { name: 'Replace my data' }),
    )
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce())
    vi.unstubAllGlobals()
  })

  it('offers to restore when the bucket already has backups', async () => {
    await bucket.provider.putSnapshot('2026-11-01T08-00-00-000Z.json', '{}')
    const user = userEvent.setup()
    const card = await openBackup()
    await user.type(card.getByLabelText('Project URL'), 'abcd.supabase.co')
    await user.type(
      card.getByLabelText('API key (anon or publishable)'),
      'sb_publishable_abc',
    )
    await user.click(card.getByRole('button', { name: 'Connect' }))
    expect(
      await card.findByText(/This bucket already has 1 backup\./),
    ).toBeInTheDocument()
  })
})
