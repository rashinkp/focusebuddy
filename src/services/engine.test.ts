import { describe, expect, it } from 'vitest'
import { freshData, transition, validAmount, type Action } from './engine'
import type { AppData } from '../types'
import { dayBounds, dayKey, inDay, MINUTE, workDuration } from '../utils/time'

const base = new Date(2026, 9, 28, 10).getTime()
const act = (d: AppData, type: Action['type'], now = base) =>
  transition(d, { type } as Action, now)
function advance(d: AppData, from: number, to: number) {
  for (let t = from + 15_000; t <= to; t += 15_000) d = act(d, 'tick', t)
  return act(d, 'tick', to)
}
function due() {
  return advance(act(freshData(), 'start'), base, base + 45 * MINUTE)
}

describe('water records', () => {
  it.each([0, -1, 2001, 1.5, NaN, Infinity])(
    'rejects invalid amount %s',
    (amount) => expect(validAmount(amount)).toBe(false),
  )
  it('adds, edits, and deletes individual entries without duplicated totals', () => {
    let d = transition(
      freshData(),
      { type: 'water-add', amount: 250, id: 'w1' },
      base,
    )
    d = transition(d, { type: 'water-edit', amount: 500, id: 'w1' }, base)
    expect(d.water[0]).toEqual({ id: 'w1', timestamp: base, amountMl: 500 })
    expect(
      transition(d, { type: 'water-add', id: 'w1', amount: 100 }, base),
    ).toBe(d)
    expect(
      transition(d, { type: 'water-edit', id: 'w1', amount: -1 }, base),
    ).toBe(d)
    d = transition(d, { type: 'water-delete', id: 'w1' }, base)
    expect(d.water).toEqual([])
  })
})
describe('coordinated sessions', () => {
  it('prevents duplicate sessions and ignores invalid transitions', () => {
    const d = act(freshData(), 'start')
    expect(act(d, 'start')).toBe(d)
    expect(act(d, 'complete-break')).toBe(d)
    expect(act(d, 'resume')).toBe(d)
  })
  it('excludes paused time and closes each active segment once', () => {
    let d = act(freshData(), 'start')
    d = act(d, 'pause', base + MINUTE)
    expect(d.active?.remainingMs).toBe(44 * MINUTE)
    d = act(d, 'resume', base + 10 * MINUTE)
    expect(d.active?.deadline).toBe(base + 54 * MINUTE)
    d = act(d, 'end', base + 11 * MINUTE)
    expect(workDuration(d, base + 20 * MINUTE)).toBe(2 * MINUTE)
    expect(d.active).toBeNull()
    expect(act(d, 'end')).toBe(d)
  })
  it('creates a single due event while work continues until the break starts', () => {
    const d = due()
    expect(d.active?.phase).toBe('due')
    const event = d.active?.dueEventId
    const later = act(d, 'tick', base + 45 * MINUTE + 20_000)
    expect(later.active?.dueEventId).toBe(event)
    expect(workDuration(later, base + 46 * MINUTE)).toBe(46 * MINUTE)
  })
  it('records completion explicitly and excludes all break time', () => {
    const start = base + 45 * MINUTE
    let d = act(due(), 'start-break', start)
    expect(act(d, 'complete-break', start)).toBe(d)
    d = advance(d, start, start + 5 * MINUTE)
    expect(d.active?.phase).toBe('ready')
    expect(d.breaks).toHaveLength(0)
    d = act(d, 'complete-break', start + 5 * MINUTE + 10_000)
    expect(d.breaks[0].status).toBe('completed')
    expect(d.breaks[0].durationMs).toBe(5 * MINUTE)
    expect(workDuration(d, start + 5 * MINUTE + 10_000)).toBe(45 * MINUTE)
    expect(act(d, 'complete-break', start + 5 * MINUTE + 10_000)).toBe(d)
  })
  it('freezes and resumes a break and records interrupted duration', () => {
    const start = base + 45 * MINUTE
    let d = act(due(), 'start-break', start)
    d = act(d, 'pause', start + MINUTE)
    expect(d.active?.remainingMs).toBe(4 * MINUTE)
    d = act(d, 'resume', start + 10 * MINUTE)
    d = act(d, 'end-break', start + 11 * MINUTE)
    expect(d.breaks[0].durationMs).toBe(2 * MINUTE)
    expect(d.breaks[0].status).toBe('interrupted')
    expect(d.active?.phase).toBe('working')
  })
  it('ends a paused break as interrupted, without completing it', () => {
    const start = base + 45 * MINUTE
    let d = act(due(), 'start-break', start)
    d = act(d, 'pause', start + MINUTE)
    d = act(d, 'end', start + 10 * MINUTE)
    expect(d.breaks[0]).toMatchObject({
      status: 'interrupted',
      durationMs: MINUTE,
    })
    expect(d.active).toBeNull()
  })
  it('snoozes for five working minutes and gives the next event a fresh ID', () => {
    let d = due()
    const old = d.active?.dueEventId
    const start = base + 45 * MINUTE
    d = act(d, 'snooze', start)
    expect(d.breaks).toHaveLength(0)
    expect(d.active?.deadline).toBe(start + 5 * MINUTE)
    d = advance(d, start, start + 5 * MINUTE)
    expect(d.active?.phase).toBe('due')
    expect(d.active?.dueEventId).not.toBe(old)
  })
  it('skips once and restarts a full work interval', () => {
    const now = base + 45 * MINUTE
    const d = act(due(), 'skip', now)
    expect(d.breaks[0].status).toBe('skipped')
    expect(d.active?.deadline).toBe(now + 45 * MINUTE)
    expect(act(d, 'skip', now)).toBe(d)
  })
  it('keeps a due reminder on resume without sending a second event', () => {
    const now = base + 45 * MINUTE
    let d = act(due(), 'pause', now)
    d = act(d, 'resume', now + MINUTE)
    expect(d.active?.phase).toBe('due')
    expect(d.active?.dueEventId).toBeNull()
  })
  it('applies interval settings at boundaries or on explicit reset', () => {
    let d = act(freshData(), 'start')
    d = transition(
      d,
      {
        type: 'settings',
        settings: { ...d.settings, workIntervalMinutes: 20 },
      },
      base + 10_000,
    )
    expect(d.active?.deadline).toBe(base + 45 * MINUTE)
    d = act(d, 'reset-countdown', base + MINUTE)
    expect(d.active?.deadline).toBe(base + 21 * MINUTE)
    expect(workDuration(d, base + MINUTE)).toBe(MINUTE)
  })
})
describe('refresh and suspension recovery', () => {
  it('restores the exact deadline on a short refresh', () => {
    const d = act(freshData(), 'start')
    const restored = act(JSON.parse(JSON.stringify(d)), 'tick', base + 20_000)
    expect(restored.active?.phase).toBe('working')
    expect(restored.active?.deadline).toBe(d.active?.deadline)
  })
  it('pauses at the last checkpoint and excludes a long absence', () => {
    let d = act(freshData(), 'start')
    d = act(d, 'tick', base + 15_000)
    d = act(d, 'tick', base + 2 * 60 * MINUTE)
    expect(d.active?.phase).toBe('paused')
    expect(workDuration(d, base + 2 * 60 * MINUTE)).toBe(15_000)
    expect(d.active?.remainingMs).toBe(45 * MINUTE - 15_000)
    expect(d.breaks).toHaveLength(0)
  })
  it('excludes an unobserved gap from break time', () => {
    const start = base + 45 * MINUTE
    let d = act(due(), 'start-break', start)
    d = act(d, 'tick', start + 15_000)
    d = act(d, 'tick', start + 60 * MINUTE)
    expect(d.active?.phase).toBe('paused')
    expect(d.active?.resumePhase).toBe('break')
    expect(d.active?.remainingMs).toBe(5 * MINUTE - 15_000)
  })
})
describe('calendar days and reset', () => {
  it('assigns midnight entries to the correct local date', () => {
    const [start, end] = dayBounds(base)
    expect(inDay(start, base)).toBe(true)
    expect(inDay(end - 1, base)).toBe(true)
    expect(inDay(end, base)).toBe(false)
    expect(dayKey(start)).toBe('2026-10-28')
  })
  it('splits ongoing work across midnight without ending the session', () => {
    const midnight = dayBounds(base)[0]
    const d = act(freshData(), 'start', midnight - 10 * MINUTE)
    expect(workDuration(d, midnight + 20 * MINUTE, midnight - 1)).toBe(
      10 * MINUTE,
    )
    expect(workDuration(d, midnight + 20 * MINUTE, midnight)).toBe(20 * MINUTE)
    expect(d.active?.phase).toBe('working')
  })
  it('preserves yesterday’s part when resetting a cross-midnight session', () => {
    const midnight = dayBounds(base)[0]
    let d = act(freshData(), 'start', midnight - 10 * MINUTE)
    d = transition(
      d,
      { type: 'water-add', id: 'yesterday', amount: 250 },
      midnight - 1,
    )
    d = transition(d, { type: 'water-add', id: 'today', amount: 500 }, midnight)
    d = act(d, 'reset-today', midnight + 20 * MINUTE)
    expect(d.water.map((e) => e.id)).toEqual(['yesterday'])
    expect(d.active).toBeNull()
    expect(workDuration(d, midnight + 20 * MINUTE, midnight - 1)).toBe(
      10 * MINUTE,
    )
    expect(workDuration(d, midnight + 20 * MINUTE, midnight)).toBe(0)
    expect(d.settings.dailyWaterGoalMl).toBe(2000)
  })
  it('handles multi-day segments by intersection', () => {
    const [start, end] = dayBounds(base)
    const d = freshData()
    d.sessions.push({
      id: 'long',
      startedAt: start - 100_000,
      endedAt: end + 100_000,
      segments: [{ start: start - 100_000, end: end + 100_000 }],
    })
    expect(workDuration(d, end + 100_000, base)).toBe(end - start)
  })
})
