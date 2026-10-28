import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { Toast } from './Toast'

afterEach(() => { cleanup(); vi.useRealTimers() })

it('dismisses after three seconds despite parent rerenders and retains exit content', () => {
  vi.useFakeTimers()
  const first = vi.fn()
  const latest = vi.fn()
  const view = render(<Toast message="Water added" onDismiss={first} />)
  act(() => vi.advanceTimersByTime(2000))
  view.rerender(<Toast message="Water added" onDismiss={latest} />)
  act(() => vi.advanceTimersByTime(999))
  expect(latest).not.toHaveBeenCalled()
  act(() => vi.advanceTimersByTime(1))
  expect(latest).toHaveBeenCalledOnce()
  expect(first).not.toHaveBeenCalled()
  view.rerender(<Toast message="" onDismiss={latest} />)
  expect(view.container.querySelector('.toast')?.getAttribute('data-open')).toBe('false')
  expect(view.container.querySelector('.toast')?.textContent).toContain('Water added')
})

it('restarts the delay for a replacement message and cancels it on unmount', () => {
  vi.useFakeTimers()
  const dismiss = vi.fn()
  const view = render(<Toast message="First message" onDismiss={dismiss} />)
  act(() => vi.advanceTimersByTime(2000))
  view.rerender(<Toast message="New message" onDismiss={dismiss} />)
  act(() => vi.advanceTimersByTime(2999))
  expect(dismiss).not.toHaveBeenCalled()
  view.unmount()
  act(() => vi.advanceTimersByTime(1000))
  expect(dismiss).not.toHaveBeenCalled()
})
