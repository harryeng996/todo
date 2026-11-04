import { describe, expect, it } from 'vitest'
import { formatDelta } from './format.ts'
import {
  chartPoints,
  formatWeight,
  normalizeLog,
  parseWeight,
  slidesOf,
  weightComparison,
} from './weight.ts'

describe('saved logs', () => {
  it('reads logs from when a day had one photo, keeping it under the date', () => {
    expect(
      normalizeLog({
        '2026-10-01': { kg: 75, hasPhoto: true },
        '2026-10-02': { kg: 74, hasPhoto: false },
        '2026-10-03': { kg: null, hasPhoto: false }, // empty: dropped
        '2026-10-04': { kg: null, photos: ['2026-10-04~a', 7, '2026-10-04~b'] },
        '2026-10-05': 'garbage',
      }),
    ).toEqual({
      '2026-10-01': { kg: 75, photos: ['2026-10-01'] },
      '2026-10-02': { kg: 74, photos: [] },
      '2026-10-04': { kg: null, photos: ['2026-10-04~a', '2026-10-04~b'] },
    })
    expect(normalizeLog(null)).toEqual({})
  })

  it('lists photos for a slideshow, oldest day first, each in the order added', () => {
    const log = {
      '2026-10-03': { kg: null, photos: ['c1', 'c2'] },
      '2026-10-01': { kg: 70, photos: ['a1'] },
      '2026-10-02': { kg: 71, photos: [] },
    }
    expect(slidesOf(log).map((slide) => slide.photo)).toEqual([
      'a1',
      'c1',
      'c2',
    ])
    expect(slidesOf(log, ['2026-10-03'])).toEqual([
      { date: '2026-10-03', photo: 'c1' },
      { date: '2026-10-03', photo: 'c2' },
    ])
  })
})

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
    '2026-07-01': { kg: 80, photos: [] }, // older than 90 days
    '2026-10-01': { kg: 75, photos: ['p'] },
    '2026-10-20': { kg: null, photos: ['p'] }, // photo only
    '2026-11-03': { kg: 72.7, photos: [] },
    '2026-10-15': { kg: 74, photos: [] },
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
    '2026-10-20': { kg: 75, photos: [] }, // more than 10 days before
    '2026-10-25': { kg: 74, photos: [] },
    '2026-10-30': { kg: 73, photos: ['p'] },
    '2026-11-01': { kg: null, photos: ['p'] }, // photo only: ignored
    '2026-11-02': { kg: 72.5, photos: [] },
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
