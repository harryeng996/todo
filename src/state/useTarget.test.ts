import { describe, expect, it } from 'vitest'
import { countdownFor } from './useTarget.ts'

// 10 days: 1 Nov … 10 Nov (final day inclusive)
const target = {
  title: 'Thesis',
  startDate: '2026-11-01',
  endDate: '2026-11-10',
}

describe('countdownFor', () => {
  it('counts today as elapsed and the final day as left', () => {
    expect(countdownFor(target, '2026-11-01')).toEqual({
      progress: 0.1,
      status: '9 days left',
    })
    expect(countdownFor(target, '2026-11-09')).toEqual({
      progress: 0.9,
      status: '1 day left',
    })
  })

  it('reaches 100% on the final day', () => {
    expect(countdownFor(target, '2026-11-10')).toEqual({
      progress: 1,
      status: 'last day!',
    })
  })

  it('handles before the start and after the end', () => {
    expect(countdownFor(target, '2026-10-30')).toEqual({
      progress: 0,
      status: 'starts in 2 days',
    })
    expect(countdownFor(target, '2026-11-11')).toEqual({
      progress: 1,
      status: 'target reached',
    })
  })

  it('is not thrown off by a DST change inside the period', () => {
    const autumn = {
      title: 'x',
      startDate: '2026-10-24',
      endDate: '2026-10-27',
    }
    expect(countdownFor(autumn, '2026-10-26')).toEqual({
      progress: 0.75,
      status: '1 day left',
    })
  })
})
