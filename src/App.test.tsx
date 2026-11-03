import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import App from './App.tsx'

describe('App', () => {
  it('shows sample todos on first visit', () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'To-do' })).toBeInTheDocument()
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)
  })

  it('adds, completes and deletes a todo, and persists it', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.type(screen.getByLabelText('New to-do'), 'Water plants{Enter}')
    const checkbox = screen.getByRole('checkbox', { name: 'Water plants' })
    await user.click(checkbox)
    expect(checkbox).toBeChecked()

    unmount()
    render(<App />)
    expect(screen.getByRole('checkbox', { name: 'Water plants' })).toBeChecked()

    await user.click(
      screen.getByRole('button', { name: 'Delete "Water plants"' }),
    )
    expect(screen.queryByText('Water plants')).not.toBeInTheDocument()
  })
})
