import { describe, expect, it } from 'vitest'
import { rangeProblem, resolveRange } from './useGridRange.ts'

const today = '2026-11-03' // a Tuesday

describe('resolveRange', () => {
  it('ends presets today and starts them on a Sunday, GitHub-style', () => {
    expect(resolveRange({ preset: '1m' }, today)).toEqual({
      from: '2026-10-04',
      to: today,
    })
    expect(resolveRange({ preset: '6m' }, today)).toEqual({
      from: '2026-05-10',
      to: today,
    })
    expect(resolveRange({ preset: '1y' }, today)).toEqual({
      from: '2025-11-02',
      to: today,
    })
  })

  it('uses a custom range as given', () => {
    const range = {
      preset: 'custom' as const,
      from: '2026-01-01',
      to: '2026-03-31',
    }
    expect(resolveRange(range, today)).toEqual({
      from: '2026-01-01',
      to: '2026-03-31',
    })
  })
})

describe('rangeProblem', () => {
  it('accepts sensible ranges', () => {
    expect(rangeProblem('2026-01-01', '2026-03-31', today)).toBeNull()
  })

  it('rejects empty, reversed, future and over-long ranges', () => {
    expect(rangeProblem('', '2026-03-31', today)).toMatch(/both dates/)
    expect(rangeProblem('2026-04-01', '2026-03-31', today)).toMatch(
      /on or before/,
    )
    expect(rangeProblem('2026-12-01', '2026-12-31', today)).toMatch(
      /start by today/,
    )
    expect(rangeProblem('2024-01-01', '2026-01-01', today)).toMatch(
      /a year or less/,
    )
  })
})
