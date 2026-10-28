import { describe, expect, it } from 'vitest'
import { historyRange, parseDay, rangeBounds, validRange } from './historyDates'
import { freshData } from '../services/engine'
import { MINUTE, workDurationBetween } from './time'

const now = new Date(2026, 9, 28, 13).getTime()
describe('history date ranges', () => {
  it('resolves today and yesterday in local calendar dates', () => {
    expect(historyRange({ preset: 'today' }, now)).toEqual({
      start: '2026-10-28',
      end: '2026-10-28',
    })
    expect(historyRange({ preset: 'yesterday' }, now)).toEqual({
      start: '2026-10-27',
      end: '2026-10-27',
    })
  })
  it('uses the preceding full Monday–Sunday week', () => {
    expect(historyRange({ preset: 'week' }, now)).toEqual({
      start: '2026-10-19',
      end: '2026-10-25',
    })
    expect(
      historyRange({ preset: 'week' }, new Date(2026, 9, 26).getTime()),
    ).toEqual({ start: '2026-10-19', end: '2026-10-25' })
  })
  it('handles previous months, leap years, and year boundaries', () => {
    expect(historyRange({ preset: 'month' }, now)).toEqual({
      start: '2026-09-01',
      end: '2026-09-30',
    })
    expect(
      historyRange({ preset: 'month' }, new Date(2024, 2, 15).getTime()),
    ).toEqual({ start: '2024-02-01', end: '2024-02-29' })
    expect(
      historyRange({ preset: 'month' }, new Date(2026, 0, 15).getTime()),
    ).toEqual({ start: '2025-12-01', end: '2025-12-31' })
  })
  it('rejects invalid, reversed, or future custom ranges', () => {
    expect(parseDay('2026-02-30')).toBeNull()
    expect(validRange({ start: '2026-10-28', end: '2026-10-27' }, now)).toBe(
      false,
    )
    expect(validRange({ start: '2026-10-28', end: '2026-10-29' }, now)).toBe(
      false,
    )
    expect(validRange({ start: '2026-10-28', end: '2026-10-28' }, now)).toBe(
      true,
    )
  })
  it('includes the entire end date and clips cross-boundary work segments', () => {
    const range = { start: '2026-10-26', end: '2026-10-27' }
    const [start, end] = rangeBounds(range)
    expect(new Date(end).getDate()).toBe(28)
    const data = freshData()
    data.sessions.push({
      id: 'cross-midnight',
      startedAt: start - MINUTE,
      endedAt: start + MINUTE,
      segments: [{ start: start - MINUTE, end: start + MINUTE }],
    })
    expect(workDurationBetween(data, now, start, end)).toBe(MINUTE)
  })
})
