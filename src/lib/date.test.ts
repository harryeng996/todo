import { describe, expect, it } from 'vitest'
import {
  addDays,
  buildGrid,
  buildRangeGrid,
  formatRange,
  dayOfWeek,
  daysBetween,
  monthLabels,
  msUntilNextDay,
  toDateKey,
} from './date.ts'

describe('date keys', () => {
  it('uses the local day, not the UTC day', () => {
    // 00:30 on 1 July in London is still 30 June in UTC.
    expect(toDateKey(new Date(2026, 6, 1, 0, 30))).toBe('2026-07-01')
  })

  it('adds days across month, year and DST boundaries', () => {
    expect(addDays('2026-01-31', 1)).toBe('2026-02-01')
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01')
    expect(addDays('2026-03-28', 2)).toBe('2026-03-30') // clocks go forward 29 Mar
    expect(addDays('2026-10-24', 2)).toBe('2026-10-26') // clocks go back 25 Oct
  })

  it('counts whole days, including across DST', () => {
    expect(daysBetween('2026-03-28', '2026-03-30')).toBe(2)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
    expect(daysBetween('2026-11-03', '2026-11-01')).toBe(-2)
  })

  it('knows when the next midnight is, on short and long days', () => {
    expect(msUntilNextDay(new Date(2026, 2, 29, 23, 0))).toBe(3_600_000)
    expect(msUntilNextDay(new Date(2026, 9, 25, 23, 0))).toBe(3_600_000)
    expect(msUntilNextDay(new Date(2026, 2, 29, 0, 0))).toBe(23 * 3_600_000)
  })
})

describe('buildGrid (GitHub layout)', () => {
  const today = '2026-11-03' // a Tuesday
  const grid = buildGrid(today)

  it('has 53 Sunday-first weeks ending with the current week', () => {
    expect(grid).toHaveLength(53)
    expect(grid.every((week) => week.length === 7)).toBe(true)
    expect(grid[0][0]).toBe('2025-11-02')
    expect(grid.every((week) => dayOfWeek(week[0]!) === 0)).toBe(true)
    expect(grid[52]).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      null,
      null,
      null,
      null,
    ])
  })

  it('has every day exactly once, in order', () => {
    const days = grid.flat().filter((day) => day !== null)
    expect(days).toHaveLength(53 * 7 - 4)
    days.forEach((day, i) => expect(day).toBe(addDays('2025-11-02', i)))
  })

  it('labels each month once, dropping a cramped leading month', () => {
    const labels = monthLabels(grid)
    expect(labels.map((l) => l.label)).toEqual([
      'Nov',
      'Dec',
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sept',
      'Oct',
      'Nov',
    ])
    expect(labels[0].column).toBe(0)
  })
})

describe('buildRangeGrid', () => {
  it('covers whole Sunday-first weeks, hiding days outside the range', () => {
    // Wed 21 Oct – Tue 3 Nov 2026
    const grid = buildRangeGrid('2026-10-21', '2026-11-03', '2026-11-03')
    expect(grid).toHaveLength(3)
    expect(grid[0]).toEqual([
      null,
      null,
      null,
      '2026-10-21',
      '2026-10-22',
      '2026-10-23',
      '2026-10-24',
    ])
    expect(grid[2]).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
      null,
      null,
      null,
      null,
    ])
  })

  it('never shows days after today', () => {
    const grid = buildRangeGrid('2026-11-01', '2026-11-07', '2026-11-03')
    expect(grid.flat().filter(Boolean)).toEqual([
      '2026-11-01',
      '2026-11-02',
      '2026-11-03',
    ])
  })

  it('labels months from the first shown day of each column', () => {
    // Starts on a Wednesday, so the first column's Sunday (4 Oct) is hidden.
    const grid = buildRangeGrid('2026-10-07', '2026-11-30', '2026-11-30')
    expect(grid[0][0]).toBeNull()
    expect(monthLabels(grid)).toEqual([
      { column: 0, label: 'Oct' },
      { column: 4, label: 'Nov' },
    ])
  })
})

describe('formatRange', () => {
  it('shows the year once, or both when they differ', () => {
    expect(formatRange('2026-05-03', '2026-11-03')).toBe('3 May – 3 Nov 2026')
    expect(formatRange('2025-11-02', '2026-11-03')).toBe(
      '2 Nov 2025 – 3 Nov 2026',
    )
  })
})
