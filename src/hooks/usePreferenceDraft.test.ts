import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, renderHook } from '@testing-library/react'
import { usePreferenceDraft } from './usePreferenceDraft'
import { defaults } from '../services/engine'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('saves after a pause in typing without restarting on unrelated renders', () => {
  vi.useFakeTimers()
  const dispatch = vi.fn()
  const { result, rerender } = renderHook(
    ({ settings }) => usePreferenceDraft(settings, true, dispatch),
    { initialProps: { settings: { ...defaults } } },
  )
  act(() => result.current.change('dailyWaterGoalMl', 250))
  act(() => vi.advanceTimersByTime(200))
  act(() => result.current.change('dailyWaterGoalMl', 2500))
  rerender({ settings: { ...defaults } })
  act(() => vi.advanceTimersByTime(399))
  expect(dispatch).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(1))
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({
    type: 'settings',
    settings: { ...defaults, dailyWaterGoalMl: 2500 },
  })
})

it('saves valid fields independently and reverts unfinished input on blur', () => {
  vi.useFakeTimers()
  const dispatch = vi.fn()
  const { result } = renderHook(() =>
    usePreferenceDraft(defaults, true, dispatch),
  )
  act(() => {
    result.current.change('dailyWaterGoalMl', 0)
    result.current.change('workIntervalMinutes', 20)
  })
  act(() => vi.advanceTimersByTime(400))
  expect(dispatch).toHaveBeenLastCalledWith({
    type: 'settings',
    settings: { ...defaults, workIntervalMinutes: 20 },
  })
  act(() => result.current.blur('dailyWaterGoalMl'))
  expect(result.current.draft.dailyWaterGoalMl).toBe(defaults.dailyWaterGoalMl)
  act(() => result.current.setNotifications(true))
  expect(dispatch).toHaveBeenLastCalledWith({
    type: 'settings',
    settings: {
      ...defaults,
      workIntervalMinutes: 20,
      notificationsEnabled: true,
    },
  })
})

it('flushes pending edits when closing without a second delayed save', () => {
  vi.useFakeTimers()
  const dispatch = vi.fn()
  const { result, unmount } = renderHook(() =>
    usePreferenceDraft(defaults, true, dispatch),
  )
  act(() => result.current.change('breakDurationMinutes', 10))
  act(() => result.current.flush())
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({
    type: 'settings',
    settings: { ...defaults, breakDurationMinutes: 10 },
  })
  unmount()
  act(() => vi.advanceTimersByTime(1000))
  expect(dispatch).toHaveBeenCalledOnce()
})
