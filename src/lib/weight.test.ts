import { describe, expect, it } from 'vitest'
import { formatDelta } from './format.ts'
import {
  chartPoints,
  formatWeight,
  parseWeight,
  weightComparison,
} from './weight.ts'

describe('weight units', () => {
  it('stores kg and shows kg or lb', () => {
    expect(formatWeight(72.4, 'kg')).toBe('72.4 kg')
    expect(formatWeight(72.4, 'lb')).toBe('159.6 lb')
  })

  it('parses typed weights in the chosen unit', () => {
    expect(parseWeight('72.4', 'kg')).toBe(72.4)
    expect(parseWeight('72,4', 'kg')).toBe(72.4)
    expect(parseWeight('159.6', 'lb')).toBeCloseTo(72.39, 2)
  })

  it('rejects empty, non-numeric and implausible values', () => {
    expect(parseWeight('', 'kg')).toBeNull()
    expect(parseWeight('abc', 'kg')).toBeNull()
    expect(parseWeight('5', 'kg')).toBeNull()
    expect(parseWeight('900', 'kg')).toBeNull()
  })
})

describe('chart data', () => {
  const log = {
    '2026-07-01': { kg: 80, hasPhoto: false }, // older than 90 days
    '2026-10-01': { kg: 75, hasPhoto: true },
    '2026-10-20': { kg: null, hasPhoto: true }, // photo only
    '2026-11-03': { kg: 72.7, hasPhoto: false },
    '2026-10-15': { kg: 74, hasPhoto: false },
  }

  it('keeps weigh-ins in the window, oldest first (by date, not weight)', () => {
    expect(chartPoints(log, '2026-11-03').map((p) => p.date)).toEqual([
      '2026-10-01',
      '2026-10-15',
      '2026-11-03',
    ])
  })
})

describe('weightComparison', () => {
  const log = {
    '2026-10-20': { kg: 75, hasPhoto: false }, // more than 10 days before
    '2026-10-25': { kg: 74, hasPhoto: false },
    '2026-10-30': { kg: 73, hasPhoto: true },
    '2026-11-01': { kg: null, hasPhoto: true }, // photo only: ignored
    '2026-11-02': { kg: 72.5, hasPhoto: false },
  }

  it('compares against the previous entry and the 10 days before', () => {
    expect(weightComparison(log, '2026-11-02')).toEqual({
      current: { date: '2026-11-02', kg: 72.5 },
      previous: { date: '2026-10-30', kg: 73 },
      average10: 73.5, // 25 Oct and 30 Oct
    })
  })

  it('uses the latest weigh-in on or before the day asked about', () => {
    const result = weightComparison(log, '2026-11-01')
    expect(result.current).toEqual({ date: '2026-10-30', kg: 73 })
    expect(result.previous).toEqual({ date: '2026-10-25', kg: 74 })
  })

  it('handles a first weigh-in and an empty log', () => {
    expect(weightComparison(log, '2026-10-20')).toEqual({
      current: { date: '2026-10-20', kg: 75 },
      previous: null,
      average10: null,
    })
    expect(weightComparison({}, '2026-11-02').current).toBeNull()
  })
})

describe('formatDelta', () => {
  it('signs and rounds changes', () => {
    expect(formatDelta(1.24)).toBe('+1.2')
    expect(formatDelta(-0.44)).toBe('−0.4')
    expect(formatDelta(0.04)).toBe('±0.0')
    expect(formatDelta(-2, 0)).toBe('−2')
  })
})
