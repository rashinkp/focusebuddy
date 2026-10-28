import { beforeEach, describe, expect, it } from 'vitest'
import { freshData, transition } from './engine'
import { clear, isData, load, save, STORAGE_KEY } from './storage'

beforeEach(() => localStorage.clear())
describe('versioned persistence', () => {
  it('returns independent safe defaults for an empty store', () => {
    expect(load().data).toEqual(freshData())
    expect(load().blocked).toBe(false)
  })
  it('round-trips records, settings, and an active session', () => {
    const data = transition(freshData(), { type: 'start' }, Date.now())
    expect(save(data)).toBe('')
    expect(load().data).toEqual(data)
    expect(isData(data)).toBe(true)
  })
  it.each([
    '{broken',
    JSON.stringify({ schemaVersion: 99 }),
    JSON.stringify({
      ...freshData(),
      water: [{ id: 'a', timestamp: 0, amountMl: -1 }],
    }),
  ])('preserves unreadable data and blocks writes', (raw) => {
    localStorage.setItem(STORAGE_KEY, raw)
    expect(load().blocked).toBe(true)
    expect(load().warning).toContain('left untouched')
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })
  it('rejects duplicate IDs and inconsistent active sessions', () => {
    const data = freshData()
    data.water = [
      { id: 'a', amountMl: 200, timestamp: 10 },
      { id: 'a', amountMl: 200, timestamp: 20 },
    ]
    expect(isData(data)).toBe(false)
    const running = transition(freshData(), { type: 'start' }, 10)
    running.active!.workStartedAt = null
    expect(isData(running)).toBe(false)
  })
  it('keeps the app usable when reads or writes fail', () => {
    const denied = {
      getItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
      setItem: () => {
        throw new DOMException('full', 'QuotaExceededError')
      },
      removeItem: () => {
        throw new DOMException('blocked', 'SecurityError')
      },
    }
    expect(load(denied).blocked).toBe(false)
    expect(load(denied).warning).toContain('may not survive')
    expect(save(freshData(), denied)).toContain('could not be saved')
    expect(clear(denied)).toBe(false)
  })
  it('clears only app-owned data', () => {
    localStorage.setItem('other-app', 'keep')
    save(freshData())
    expect(clear()).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(localStorage.getItem('other-app')).toBe('keep')
  })
})
