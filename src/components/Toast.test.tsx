import { afterEach, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Toast } from './Toast'
import { useToasts } from '../hooks/useToasts'

function Harness() {
  const { messages, notify, dismiss } = useToasts()
  return (
    <>
      <button onClick={() => notify('Water added')}>Notify</button>
      <Toast messages={messages} onDismiss={dismiss} />
    </>
  )
}
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

it('stacks repeated messages and expires each after its own three seconds', () => {
  vi.useFakeTimers()
  const view = render(<Harness />)
  fireEvent.click(screen.getByText('Notify'))
  act(() => vi.advanceTimersByTime(1000))
  fireEvent.click(screen.getByText('Notify'))
  expect(view.container.querySelectorAll('.toast')).toHaveLength(2)
  act(() => vi.advanceTimersByTime(2000))
  expect(
    view.container.querySelectorAll('.toast[data-open="false"]'),
  ).toHaveLength(1)
  expect(
    view.container.querySelectorAll('.toast[data-open="true"]'),
  ).toHaveLength(1)
  act(() => vi.advanceTimersByTime(280))
  expect(view.container.querySelectorAll('.toast')).toHaveLength(1)
  act(() => vi.advanceTimersByTime(720))
  expect(
    view.container.querySelectorAll('.toast[data-open="false"]'),
  ).toHaveLength(1)
  act(() => vi.advanceTimersByTime(280))
  expect(view.container.querySelectorAll('.toast')).toHaveLength(0)
})

it('dismisses one toast without dismissing the others and expands on hover', () => {
  const view = render(<Harness />)
  fireEvent.click(screen.getByText('Notify'))
  fireEvent.click(screen.getByText('Notify'))
  fireEvent.mouseEnter(view.container.querySelector('.toast-stack')!)
  expect(
    screen.getAllByRole('button', { name: 'Dismiss message' }),
  ).toHaveLength(2)
  fireEvent.click(screen.getAllByRole('button', { name: 'Dismiss message' })[0])
  expect(
    view.container.querySelectorAll('.toast[data-open="true"]'),
  ).toHaveLength(1)
})

it('bounds the stack and clears pending timers when unmounted', () => {
  vi.useFakeTimers()
  const view = render(<Harness />)
  for (let i = 0; i < 6; i++) fireEvent.click(screen.getByText('Notify'))
  expect(view.container.querySelectorAll('.toast')).toHaveLength(3)
  view.unmount()
  expect(vi.getTimerCount()).toBe(0)
})

it('orders reminder actions and expires after ten seconds without changing the task', () => {
  vi.useFakeTimers()
  const dispatch = vi.fn()
  const task = {
    id: 'reminder', title: 'A long reminder title that wraps naturally',
    createdAt: Date.now() - 60_000, completedAt: null,
    reminderAt: Date.now() - 30_000, reminderStatus: 'due' as const,
    notificationSent: true,
  }
  const view = render(<Toast messages={[]} onDismiss={vi.fn()} tasks={[task]} onTaskAction={dispatch} />)
  expect(screen.getAllByRole('button').map((button) => button.textContent)).toEqual(['Dismiss', 'Complete'])
  act(() => vi.advanceTimersByTime(9999))
  expect(view.container.querySelector('.toast[data-open="true"]')).toBeTruthy()
  act(() => vi.advanceTimersByTime(1))
  expect(view.container.querySelector('.toast[data-open="false"]')).toBeTruthy()
  act(() => vi.advanceTimersByTime(280))
  expect(view.container.querySelector('.toast')).toBeNull()
  expect(dispatch).not.toHaveBeenCalled()
})
