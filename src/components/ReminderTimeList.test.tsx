import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ReminderTimeList } from './ReminderTimeList'

const now = new Date(2026, 9, 30, 16, 1).getTime()
afterEach(cleanup)
it('lists full AM/PM times in five-minute steps and excludes elapsed times', () => {
  render(
    <ReminderTimeList
      date="2026-10-30"
      value="16:05"
      now={now}
      onChange={vi.fn()}
    />,
  )
  expect(screen.queryByRole('option', { name: '4:00 PM' })).toBeNull()
  expect(screen.getByRole('option', { name: '4:05 PM' })).toBeTruthy()
  expect(screen.getByRole('option', { name: '4:10 PM' })).toBeTruthy()
  expect(screen.queryByRole('option', { name: '4:06 PM' })).toBeNull()
})
it('keeps an existing exact minute without rounding it', () => {
  render(
    <ReminderTimeList
      date="2026-10-31"
      value="16:03"
      now={now}
      onChange={vi.fn()}
    />,
  )
  expect(
    screen
      .getByRole('option', { name: '4:03 PM' })
      .getAttribute('aria-selected'),
  ).toBe('true')
})
it('supports keyboard navigation through the scrollable times', async () => {
  const user = userEvent.setup()
  const change = vi.fn()
  render(
    <ReminderTimeList
      date="2026-10-30"
      value="16:05"
      now={now}
      onChange={change}
    />,
  )
  screen.getByRole('listbox', { name: 'Reminder time' }).focus()
  await user.keyboard('{ArrowDown}{Enter}')
  expect(change).toHaveBeenCalledWith('16:10')
  await user.keyboard('{End}{Enter}')
  expect(change).toHaveBeenLastCalledWith('23:55')
})
it('explains when there are no remaining times today', () => {
  render(
    <ReminderTimeList
      date="2026-10-30"
      value="23:55"
      now={new Date(2026, 9, 30, 23, 59).getTime()}
      onChange={vi.fn()}
    />,
  )
  expect(screen.getByText(/No times left today/)).toBeTruthy()
})
