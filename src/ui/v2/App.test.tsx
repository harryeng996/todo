import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import App from './App.tsx'

beforeEach(() => {
  location.hash = ''
  // jsdom has no matchMedia.
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  })) as unknown as typeof window.matchMedia
})

async function renderApp() {
  const result = render(<App />)
  await screen.findByRole('heading', { level: 1 })
  return result
}

describe('v2 home', () => {
  it('greets and shows today’s sample tasks', async () => {
    await renderApp()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      /Good (morning|afternoon|evening|night)/,
    )
    expect(screen.getAllByRole('checkbox')).toHaveLength(2) // the third sample is already done
  })

  it('adds and ticks a task', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.type(screen.getByLabelText('New to-do'), 'Water plants{Enter}')
    expect(screen.getByText('1 of 4 done')).toBeInTheDocument()
    await user.click(
      await screen.findByRole('checkbox', { name: 'Water plants' }),
    )
    // Home lists open tasks only; the finished one leaves and the count moves.
    expect(await screen.findByText('2 of 4 done')).toBeInTheDocument()
  })

  it('deletes a task and brings it back with Undo', async () => {
    const user = userEvent.setup()
    await renderApp()
    const row = screen
      .getByRole('checkbox', { name: 'Try ticking this box' })
      .closest('li')!
    await user.click(within(row).getByRole('button', { name: 'Delete task' }))
    await user.click(await screen.findByRole('button', { name: 'Undo' }))
    expect(
      await screen.findByRole('checkbox', { name: 'Try ticking this box' }),
    ).toBeInTheDocument()
  })
})

describe('v2 navigation', () => {
  it('opens Settings, which offers the switch back to v1', async () => {
    await renderApp()
    act(() => {
      location.hash = '#/settings'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(
      await screen.findByRole('heading', { name: 'Settings' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('switch', { name: /new interface/ }),
    ).toHaveAttribute('aria-checked', 'true')
  })

  it('switches the theme', async () => {
    const user = userEvent.setup()
    await renderApp()
    await user.click(
      screen.getByRole('button', { name: 'Switch to dark theme' }),
    )
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(JSON.parse(localStorage.getItem('todoapp.settings.v1')!).theme).toBe(
      'dark',
    )
  })
})
