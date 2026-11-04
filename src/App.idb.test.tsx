// The app with IndexedDB available, as in real browsers (App.test.tsx runs
// without it, on the localStorage fallback).
import 'fake-indexeddb/auto'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('todos in IndexedDB', () => {
  it('moves localStorage todos over, then saves changes there', async () => {
    localStorage.setItem(
      'todoapp.todos.v2',
      JSON.stringify([
        {
          id: 'old-1',
          title: 'Kept from before',
          done: false,
          date: '2020-01-01',
          createdAt: '2020-01-01T10:00:00.000Z',
        },
      ]),
    )
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    // Rendered once the list has been read.
    const input = await screen.findByLabelText('New to-do')
    expect(localStorage.getItem('todoapp.todos.v2')).toBeNull()

    await user.type(input, 'Water plants{Enter}')
    await user.click(screen.getByRole('checkbox', { name: 'Water plants' }))

    unmount()
    render(<App />)
    expect(
      await screen.findByRole('checkbox', { name: 'Water plants' }),
    ).toBeChecked()
    // Nothing went back into localStorage.
    expect(localStorage.getItem('todoapp.todos.v2')).toBeNull()
  })
})
