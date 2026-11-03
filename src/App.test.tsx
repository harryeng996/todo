import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App.tsx'
import { addDays, toDateKey } from './lib/date.ts'

const today = () => toDateKey(new Date())

function cell(container: HTMLElement, date: string): HTMLElement {
  const found = container.querySelector<HTMLElement>(`[data-date="${date}"]`)
  if (!found) throw new Error(`no grid cell for ${date}`)
  return found
}

afterEach(() => {
  vi.useRealTimers()
})

describe('todo list', () => {
  it("shows today's sample todos on first visit", () => {
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
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

describe('countdown', () => {
  it('sets a target inline and keeps it after a reload', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    await user.click(screen.getByRole('button', { name: 'Set a target' }))
    await user.type(screen.getByLabelText('Target'), 'Finish thesis')
    fireEvent.change(screen.getByLabelText('Final day'), {
      target: { value: addDays(today(), 9) },
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(screen.getByText('10% · 9 days left')).toBeInTheDocument()
    unmount()
    render(<App />)
    expect(screen.getByText('Finish thesis')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '10',
    )
  })

  it('rejects a final day before the start', async () => {
    const user = userEvent.setup()
    render(<App />)
    await user.click(screen.getByRole('button', { name: 'Set a target' }))
    await user.type(screen.getByLabelText('Target'), 'Oops')
    fireEvent.change(screen.getByLabelText('Final day'), {
      target: { value: addDays(today(), -1) },
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(screen.getByRole('alert')).toHaveTextContent('on or after the start')
  })
})

describe('several targets', () => {
  it('counts down each objective, adds and removes them', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)

    async function addTarget(button: string, title: string, days: number) {
      await user.click(screen.getByRole('button', { name: button }))
      await user.type(screen.getByLabelText('Target'), title)
      fireEvent.change(screen.getByLabelText('Final day'), {
        target: { value: addDays(today(), days) },
      })
      await user.click(screen.getByRole('button', { name: 'Save' }))
    }
    await addTarget('Set a target', 'Finish thesis', 9)
    await addTarget('Add target', 'Run 10 km', 29)

    expect(screen.getAllByRole('progressbar')).toHaveLength(2)
    expect(screen.getByText('10% · 9 days left')).toBeInTheDocument()
    expect(screen.getByText('3% · 29 days left')).toBeInTheDocument()

    unmount()
    render(<App />)
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)

    await user.click(
      screen.getByRole('button', { name: 'Edit target "Finish thesis"' }),
    )
    await user.click(screen.getByRole('button', { name: 'Remove target' }))
    expect(screen.getAllByRole('progressbar')).toHaveLength(1)
    expect(screen.queryByText('Finish thesis')).not.toBeInTheDocument()
    expect(screen.getByText('Run 10 km')).toBeInTheDocument()
  })

  it('keeps a target saved by the single-target version', () => {
    localStorage.setItem(
      'todoapp.target.v1',
      JSON.stringify({
        title: 'Old goal',
        startDate: today(),
        endDate: addDays(today(), 4),
      }),
    )
    render(<App />)
    expect(screen.getByText('Old goal')).toBeInTheDocument()
    expect(screen.getByText('20% · 4 days left')).toBeInTheDocument()
  })
})

describe('day grid', () => {
  it('colours days by completed todos and updates immediately', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)

    expect(screen.getByText('1 todo done')).toBeInTheDocument()
    expect(cell(container, today())).toHaveClass('day-grid__cell--l4')

    await user.click(
      screen.getByRole('checkbox', { name: 'Try ticking this box' }),
    )
    expect(screen.getByText('2 todos done')).toBeInTheDocument()
    expect(cell(container, today())).toHaveAccessibleName(/^2 todos done on/)
  })

  it('shows its date range and filters it', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    const range = () => document.getElementById('day-grid-range')!.textContent
    const cells = () =>
      container.querySelectorAll('.day-grid [data-date]').length
    const sixMonths = cells()
    expect(range()).toMatch(/ – /)
    expect(range()!.endsWith(today().slice(0, 4))).toBe(true)

    await user.selectOptions(screen.getByLabelText('Date range'), 'Last month')
    expect(cells()).toBeLessThan(sixMonths)
    await user.selectOptions(screen.getByLabelText('Date range'), 'Last year')
    expect(cells()).toBeGreaterThan(sixMonths)

    await user.selectOptions(
      screen.getByLabelText('Date range'),
      'Custom range…',
    )
    fireEvent.change(screen.getByLabelText('From'), {
      target: { value: addDays(today(), -9) },
    })
    expect(cells()).toBe(10)
    fireEvent.change(screen.getByLabelText('To'), {
      target: { value: addDays(today(), -20) },
    })
    expect(screen.getByRole('alert')).toHaveTextContent('on or before the end')
    expect(cells()).toBe(10) // the last valid range stays on screen
  })

  it('shows a past day read-only when its dot is clicked', async () => {
    const yesterday = addDays(today(), -1)
    localStorage.setItem(
      'todoapp.todos.v2',
      JSON.stringify([
        {
          id: 'a',
          title: 'Old task',
          done: false,
          date: yesterday,
          createdAt: '',
        },
      ]),
    )
    const user = userEvent.setup()
    const { container } = render(<App />)

    await user.click(cell(container, yesterday))
    expect(
      screen.getByRole('heading', { name: 'Yesterday' }),
    ).toBeInTheDocument()
    expect(screen.getByText('read-only')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Old task' })).toBeDisabled()
    expect(screen.queryByLabelText('New to-do')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /Delete/ }),
    ).not.toBeInTheDocument()
    expect(cell(container, yesterday)).toHaveAttribute('aria-selected', 'true')

    await user.click(screen.getByRole('button', { name: 'back to today' }))
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
  })

  it('moves between days with the arrow keys', () => {
    const { container } = render(<App />)
    const todayCell = cell(container, today())
    fireEvent.keyDown(todayCell, { key: 'ArrowUp' })
    fireEvent.keyDown(cell(container, addDays(today(), -1)), { key: 'Enter' })
    expect(
      screen.getByRole('heading', { name: 'Yesterday' }),
    ).toBeInTheDocument()
  })

  it('makes the previous day read-only at midnight', () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] })
    vi.setSystemTime(new Date(2026, 10, 3, 23, 59, 58))
    const { container } = render(<App />)
    expect(screen.getAllByRole('checkbox')).toHaveLength(3)

    act(() => {
      vi.advanceTimersByTime(3000)
    })
    // The selection followed the new day, which is empty and editable.
    expect(screen.getByRole('heading', { name: 'Today' })).toBeInTheDocument()
    expect(screen.queryAllByRole('checkbox')).toHaveLength(0)
    expect(screen.getByLabelText('New to-do')).toBeInTheDocument()

    fireEvent.click(cell(container, '2026-11-03'))
    expect(
      screen.getByRole('heading', { name: 'Yesterday' }),
    ).toBeInTheDocument()
    for (const box of screen.getAllByRole('checkbox'))
      expect(box).toBeDisabled()
  })
})

describe('quotes', () => {
  it('shows the next quote when dismissed and remembers it', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    const text = () => document.querySelector('.quote-card__text')!.textContent

    const first = text()
    await user.click(screen.getByRole('button', { name: 'Next quote' }))
    const second = text()
    expect(second).not.toBe(first)

    unmount()
    render(<App />)
    expect(text()).toBe(second)
  })
})

describe('music player', () => {
  it('is hidden for now, including its setting', async () => {
    const user = userEvent.setup()
    render(<App />)
    expect(
      screen.queryByRole('heading', { name: 'Music' }),
    ).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(
      within(dialog).queryByLabelText('Music player'),
    ).not.toBeInTheDocument()
  })
})

describe('settings', () => {
  it('hides and shows panels, and remembers the choice', async () => {
    const user = userEvent.setup()
    const { unmount } = render(<App />)
    expect(screen.getByRole('heading', { name: 'Videos' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: /^Weight/ }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    await user.click(within(dialog).getByLabelText('YouTube videos'))
    await user.click(
      within(dialog).getByRole('button', { name: 'Close settings' }),
    )

    expect(
      screen.queryByRole('heading', { name: 'Videos' }),
    ).not.toBeInTheDocument()
    unmount()
    render(<App />)
    expect(
      screen.queryByRole('heading', { name: 'Videos' }),
    ).not.toBeInTheDocument()
  })
})

describe('todo comparisons', () => {
  it('compares today with yesterday and the last 5 days', async () => {
    const yesterday = addDays(today(), -1)
    const fourDaysAgo = addDays(today(), -4)
    localStorage.setItem(
      'todoapp.todos.v2',
      JSON.stringify([
        { id: 'a', title: 'A', done: true, date: today(), createdAt: '' },
        { id: 'b', title: 'B', done: false, date: today(), createdAt: '' },
        { id: 'c', title: 'C', done: true, date: yesterday, createdAt: '' },
        { id: 'd', title: 'D', done: true, date: yesterday, createdAt: '' },
        { id: 'e', title: 'E', done: true, date: fourDaysAgo, createdAt: '' },
      ]),
    )
    const user = userEvent.setup()
    render(<App />)
    const stats = () =>
      document.querySelector('.todo-stats .stats')!.textContent
    expect(stats()).toContain('Today: 1 of 2 done')
    expect(stats()).toContain('vs yesterday (2): −1')
    expect(stats()).toContain('vs last 5 days (avg 0.6/day): +0.4')

    await user.click(screen.getByRole('checkbox', { name: 'B' }))
    expect(stats()).toContain('vs yesterday (2): ±0')
  })
})

describe('weight tracking', () => {
  async function enableWeight(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    await user.click(within(dialog).getByLabelText(/Weight tracking/))
    await user.click(
      within(dialog).getByRole('button', { name: 'Close settings' }),
    )
    return dialog
  }
  const panel = () =>
    screen.getByRole('heading', { name: /^Weight ·/ }).closest('section')!
  const history = () =>
    screen.getByRole('heading', { name: /Weight history/ }).closest('section')!

  it('logs today, backfills a past day and compares them', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await enableWeight(user)

    expect(
      screen.getByRole('heading', { name: 'Weight · Today' }),
    ).toBeInTheDocument()
    // The input only appears when needed.
    expect(screen.queryByLabelText('Weight in kg')).not.toBeInTheDocument()
    expect(within(panel()).getByText('No weigh-in')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log weight' }))
    await user.type(screen.getByLabelText('Weight in kg'), '72.4{Enter}')
    expect(panel().querySelector('.weight__value')).toHaveTextContent('72.4 kg')
    expect(screen.queryByLabelText('Weight in kg')).not.toBeInTheDocument()
    expect(within(panel()).getByText(/First weigh-in/)).toBeInTheDocument()

    await user.click(cell(container, addDays(today(), -1)))
    expect(
      screen.getByRole('heading', { name: 'Weight · Yesterday' }),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Log weight' }))
    await user.type(screen.getByLabelText('Weight in kg'), '73{Enter}')

    await user.click(screen.getByRole('button', { name: 'back to today' }))
    const stats = panel().querySelector('.stats')!.textContent
    expect(stats).toContain('vs previous entry')
    expect(stats).toContain('−0.6 kg')
    expect(stats).toContain('vs last 10 days (avg 73.0 kg): −0.6 kg')
  })

  it('cancels editing with Escape and when switching days', async () => {
    const user = userEvent.setup()
    const { container } = render(<App />)
    await enableWeight(user)

    await user.click(screen.getByRole('button', { name: 'Log weight' }))
    await user.type(screen.getByLabelText('Weight in kg'), '70{Escape}')
    expect(screen.queryByLabelText('Weight in kg')).not.toBeInTheDocument()
    expect(within(panel()).getByText('No weigh-in')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Log weight' }))
    await user.click(cell(container, addDays(today(), -1)))
    expect(screen.queryByLabelText('Weight in kg')).not.toBeInTheDocument()
  })

  it('shows weights in lb when chosen, and rejects nonsense', async () => {
    const user = userEvent.setup()
    render(<App />)
    const dialog = await enableWeight(user)
    await user.click(screen.getByRole('button', { name: 'Log weight' }))
    await user.type(screen.getByLabelText('Weight in kg'), '72.4{Enter}')

    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(within(dialog).getByLabelText('lb'))
    await user.click(
      within(dialog).getByRole('button', { name: 'Close settings' }),
    )
    expect(panel().querySelector('.weight__value')).toHaveTextContent(
      '159.6 lb',
    )

    await user.click(screen.getByRole('button', { name: 'Edit weight' }))
    expect(screen.getByLabelText('Weight in lb')).toHaveValue('159.6')
    await user.clear(screen.getByLabelText('Weight in lb'))
    await user.type(screen.getByLabelText('Weight in lb'), 'heavy{Enter}')
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a weight between',
    )
  })

  it('lists past entries newest first, by date, and edits or deletes them', async () => {
    const day = (offset: number) => addDays(today(), offset)
    localStorage.setItem(
      'todoapp.weight.v1',
      JSON.stringify({
        [day(-10)]: { kg: 70, hasPhoto: false },
        [day(-5)]: { kg: 74, hasPhoto: false },
        [day(-2)]: { kg: 72, hasPhoto: false },
      }),
    )
    const user = userEvent.setup()
    render(<App />)
    await enableWeight(user)

    const rows = () =>
      [...history().querySelectorAll('.history__row')].map((row) =>
        [...row.children].map((c) => c.textContent).join(' | '),
      )
    // Newest first; changes are against the entry before (never sorted by weight).
    expect(rows().map((r) => r.split(' | ').slice(1))).toEqual([
      ['72.0 kg', '−2.0'],
      ['74.0 kg', '+4.0'],
      ['70.0 kg', ''],
    ])

    // Edit the middle entry.
    await user.click(
      within(history()).getAllByRole('button', { name: /Edit$/ })[1],
    )
    const input = within(history()).getByLabelText('Weight in kg')
    expect(input).toHaveValue('74.0')
    await user.clear(input)
    await user.type(input, '71{Enter}')
    expect(rows()[1]).toContain('71.0 kg')
    expect(rows()[0]).toContain('+1.0')

    // Delete the oldest entry.
    await user.click(
      within(history()).getAllByRole('button', { name: /Edit$/ })[2],
    )
    await user.click(
      within(history()).getByRole('button', { name: 'Delete entry' }),
    )
    expect(rows()).toHaveLength(2)
    expect(rows()[1]).toMatch(/71\.0 kg \| $/)
  })
})

describe('youtube', () => {
  it('adds, switches and removes videos through a privacy-mode embed', async () => {
    const user = userEvent.setup()
    const { container, unmount } = render(<App />)
    const link = screen.getByLabelText('YouTube link or embed code')

    await user.type(link, 'not a video')
    await user.click(screen.getByRole('button', { name: 'Add video' }))
    expect(screen.getByRole('alert')).toHaveTextContent(
      "doesn't look like a YouTube link",
    )

    await user.clear(link)
    await user.type(link, 'https://youtu.be/dQw4w9WgXcQ?t=30')
    await user.type(
      screen.getByLabelText('Video name (optional)'),
      'Focus music',
    )
    await user.click(screen.getByRole('button', { name: 'Add video' }))
    const frame = () => container.querySelector('iframe')!
    expect(frame().src).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&start=30',
    )
    expect(frame().title).toBe('Focus music')

    await user.type(link, 'https://www.youtube.com/watch?v=jfKfPfyJRdk')
    await user.click(screen.getByRole('button', { name: 'Add video' }))
    expect(frame().src).toContain('/embed/jfKfPfyJRdk')

    await user.click(screen.getByRole('button', { name: 'Focus music' }))
    expect(frame().src).toContain('/embed/dQw4w9WgXcQ')

    unmount()
    const again = render(<App />)
    expect(again.container.querySelector('iframe')!.src).toContain(
      'dQw4w9WgXcQ',
    )
    await user.click(
      screen.getByRole('button', { name: 'Remove "Focus music"' }),
    )
    expect(again.container.querySelector('iframe')!.src).toContain(
      'jfKfPfyJRdk',
    )
  })
})
