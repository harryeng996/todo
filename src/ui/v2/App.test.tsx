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

describe('v2 tasks screen', () => {
  async function openTasks(section = '') {
    location.hash = `#/tasks${section}`
    render(<App />)
    await screen.findByRole('heading', { level: 1 })
  }

  it('keeps past days read-only', async () => {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const key = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`
    await openTasks(`/${key}`)
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'Yesterday',
    )
    expect(screen.queryByLabelText('New to-do')).not.toBeInTheDocument()
    expect(screen.getByText('Read-only')).toBeInTheDocument()
  })

  it('plans a task for tomorrow', async () => {
    const user = userEvent.setup()
    await openTasks()
    await user.click(screen.getByRole('button', { name: 'Next day' }))
    expect(await screen.findByText('Upcoming')).toBeInTheDocument()
    await user.type(screen.getByLabelText('New to-do'), 'Dentist{Enter}')
    expect(
      await screen.findByRole('checkbox', { name: 'Dentist' }),
    ).toBeInTheDocument()
    // Exactly one input, even after switching days.
    await user.click(screen.getByRole('button', { name: 'Previous day' }))
    expect(screen.getAllByLabelText('New to-do')).toHaveLength(1)
  })

  it('shows statistics', async () => {
    await openTasks()
    expect(screen.getByText('Done rate · 7d')).toBeInTheDocument()
    expect(screen.getByText('Done per day')).toBeInTheDocument()
    expect(screen.getByText('By weekday')).toBeInTheDocument()
    expect(
      screen.getByRole('group', { name: 'Activity by day' }),
    ).toBeInTheDocument()
  })
})

describe('v2 focus screen', () => {
  it('runs the timer and keeps it visible on other screens', async () => {
    const user = userEvent.setup()
    location.hash = '#/focus'
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: 'Focus', level: 1 }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Start' }))
    expect(screen.getByRole('button', { name: 'Pause' })).toBeInTheDocument()
    expect(document.title).toMatch(/· Focus$/)

    act(() => {
      location.hash = '#/'
      window.dispatchEvent(new HashChangeEvent('hashchange'))
    })
    expect(
      await screen.findByRole('button', { name: 'Pause timer' }),
    ).toBeInTheDocument()
  })

  it('shows focus statistics with range and task filters', async () => {
    location.hash = '#/focus'
    render(<App />)
    await screen.findByRole('heading', { name: 'Focus', level: 1 })
    expect(screen.getByText('Statistics')).toBeInTheDocument()
    expect(screen.getByLabelText('Filter by task')).toBeInTheDocument()
    expect(
      screen.getByRole('radiogroup', { name: 'Statistics range' }),
    ).toBeInTheDocument()
    expect(screen.getByText('By task')).toBeInTheDocument()
  })
})

describe('v2 body screen', () => {
  function openBody() {
    localStorage.setItem(
      'todoapp.settings.v1',
      JSON.stringify({ weightTracking: true }),
    )
    localStorage.setItem(
      'todoapp.weight.v1',
      JSON.stringify({
        '2026-01-01': { kg: 80, photos: [] },
        '2026-01-08': { kg: 79.2, photos: [] },
      }),
    )
    location.hash = '#/body'
    render(<App />)
  }

  it('shows the latest weight, its change and the log', async () => {
    openBody()
    expect(
      await screen.findByRole('heading', { name: 'Body', level: 1 }),
    ).toBeInTheDocument()
    expect(screen.getByText('Current weight')).toBeInTheDocument()
    expect(screen.getByText('2 weigh-ins')).toBeInTheDocument()
  })

  it('logs today’s weight from the sheet', async () => {
    const user = userEvent.setup()
    openBody()
    await user.click(await screen.findByRole('button', { name: 'Log weight' }))
    const input = await screen.findByLabelText('Weight in kg')
    await user.clear(input)
    await user.type(input, '78.6')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('3 weigh-ins')).toBeInTheDocument()
    expect(
      JSON.parse(localStorage.getItem('todoapp.weight.v1')!),
    ).toMatchObject({ '2026-01-01': { kg: 80 } })
  })

  it('sets a goal and shows progress', async () => {
    const user = userEvent.setup()
    openBody()
    await user.click(await screen.findByRole('button', { name: /Set a goal/ }))
    const input = await screen.findByLabelText('Goal in kg')
    await user.type(input, '76')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('20%')).toBeInTheDocument() // 80 → 79.2 of 80 → 76
  })
})
