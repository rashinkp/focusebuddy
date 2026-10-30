import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { freshData, transition, type Action } from '../services/engine'
import { TaskCard, TaskReminders } from './TaskCard'
import { TaskReminderPicker } from './TaskReminderPicker'
import { useBuddy } from '../hooks/useBuddy'
import { load, save } from '../services/storage'

const now = new Date(2026, 9, 30, 10).getTime()
beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
  localStorage.clear()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
function Tasks() {
  const [data, setData] = useState(freshData)
  const dispatch = (action: Action) =>
    setData((current) => transition(current, action, now))
  return (
    <TaskCard
      tasks={data.tasks}
      now={now}
      disabled={false}
      dispatch={dispatch}
      notify={vi.fn()}
    />
  )
}
it('adds with Enter, completes into a collapsed group, reopens, edits, and deletes a task', async () => {
  const user = userEvent.setup()
  render(<Tasks />)
  expect(
    (screen.getByRole('button', { name: 'Add task' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  await user.type(
    screen.getByRole('textbox', { name: 'New task' }),
    'Send update{Enter}',
  )
  vi.useFakeTimers()
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Complete Send update' }),
  )
  expect(document.querySelector('.tasks-completed .task-row')).toBeNull()
  act(() => {
    vi.advanceTimersByTime(2200)
  })
  vi.useRealTimers()
  expect(screen.getByText('Completed')).toBeTruthy()
  fireEvent.click(screen.getByText('Completed'))
  await user.click(screen.getByRole('checkbox', { name: 'Reopen Send update' }))
  await user.click(screen.getByLabelText('Actions for Send update'))
  await user.click(screen.getByRole('button', { name: 'Edit task' }))
  await user.clear(screen.getByRole('textbox', { name: 'Task title' }))
  await user.type(
    screen.getByRole('textbox', { name: 'Task title' }),
    'Review update',
  )
  await user.click(screen.getByRole('button', { name: 'Save changes' }))
  await user.click(screen.getByLabelText('Actions for Review update'))
  await user.click(screen.getByRole('button', { name: 'Delete' }))
  expect(screen.queryByText('Review update')).toBeNull()
})
it('sets an optional tomorrow reminder and removes the chip before adding', async () => {
  const user = userEvent.setup()
  render(<Tasks />)
  await user.click(screen.getByRole('button', { name: 'Add task reminder' }))
  await user.click(
    screen.getByRole('button', { name: 'Saturday, October 31, 2026' }),
  )
  await user.click(screen.getByRole('option', { name: '9:30 AM' }))
  expect(screen.getByText(/Tomorrow,/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Remove reminder' }))
  expect(screen.queryByText(/Tomorrow,/)).toBeNull()
})
it('rejects past picker times and cancels without changing the task draft', async () => {
  const set = vi.fn()
  const close = vi.fn()
  const user = userEvent.setup()
  render(
    <TaskReminderPicker
      now={now}
      value={now - 30 * 60_000}
      onSet={set}
      onClose={close}
    />,
  )
  expect(
    (screen.getByRole('option', { name: '9:30 AM' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Next month' }))
  await user.click(
    screen.getByRole('button', { name: 'Monday, November 2, 2026' }),
  )
  expect(set).not.toHaveBeenCalled()
  expect(screen.queryByRole('button', { name: 'Set reminder' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Close Remind me' })).toBeNull()
  await user.click(document.body)
  expect(close).toHaveBeenCalledOnce()
  expect(set).not.toHaveBeenCalled()
})
it('shows persistent grouped reminders with individual actions and respects read-only mode', async () => {
  let data = transition(
    freshData(),
    { type: 'task-add', id: 'a', title: 'Call', reminderAt: now + 1000 },
    now,
  )
  data = transition(data, { type: 'tick' }, now + 2000)
  const dispatch = vi.fn()
  const user = userEvent.setup()
  const view = render(
    <TaskReminders tasks={data.tasks} disabled={false} dispatch={dispatch} />,
  )
  const reminder = within(
    screen.getByRole('region', { name: 'Task reminders' }),
  )
  await user.click(reminder.getByRole('button', { name: 'Snooze 10 min' }))
  expect(dispatch).toHaveBeenLastCalledWith({ type: 'task-snooze', id: 'a' })
  view.rerender(
    <TaskReminders tasks={data.tasks} disabled dispatch={dispatch} />,
  )
  expect(
    (reminder.getByRole('button', { name: 'Complete' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
})
it('delivers one grouped desktop reminder, persists the claim, and avoids replay on reload or in followers', async () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: vi.fn((_name, _options, callback) => callback()) },
  })
  const delivered: string[] = []
  class NotificationMock {
    static permission = 'granted'
    constructor(title: string) {
      delivered.push(title)
    }
    close() {}
  }
  vi.stubGlobal('Notification', NotificationMock)
  let data = transition(
    freshData(),
    { type: 'task-add', id: 'a', title: 'Call', reminderAt: now + 1000 },
    now,
  )
  data = transition(
    data,
    { type: 'task-add', id: 'b', title: 'Review', reminderAt: now + 1000 },
    now,
  )
  data.settings.notificationsEnabled = true
  save(data)
  function Buddy() {
    const buddy = useBuddy()
    return (
      <span>
        {buddy.data.tasks.filter((t) => t.reminderStatus === 'due').length}
      </span>
    )
  }
  const view = render(<Buddy />)
  await act(async () => {
    vi.advanceTimersByTime(1000)
  })
  expect(delivered).toEqual(['2 task reminders'])
  expect(
    load().data.tasks.every(
      (t) => t.notificationSent && t.reminderStatus === 'due',
    ),
  ).toBe(true)
  view.unmount()
  render(<Buddy />)
  await act(async () => {
    vi.advanceTimersByTime(1000)
  })
  expect(delivered).toHaveLength(1)
  cleanup()
  const waitingData = transition(
    freshData(),
    { type: 'task-add', id: 'c', title: 'Follower', reminderAt: now + 5000 },
    now,
  )
  waitingData.settings.notificationsEnabled = true
  save(waitingData)
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: vi.fn(() => new Promise(() => {})) },
  })
  render(<Buddy />)
  await act(async () => {
    vi.advanceTimersByTime(10_000)
  })
  expect(delivered).toHaveLength(1)
  expect(load().data.tasks[0].reminderStatus).toBe('scheduled')
})

it.each([
  { period: 'AM', hour: 0 },
  { period: 'PM', hour: 12 },
])(
  'saves 12 $period as the correct reminder timestamp',
  async ({ period, hour }) => {
    const user = userEvent.setup()
    const set = vi.fn()
    render(
      <TaskReminderPicker
        now={now}
        value={null}
        onSet={set}
        onClose={vi.fn()}
      />,
    )
    await user.click(
      screen.getByRole('button', { name: 'Saturday, October 31, 2026' }),
    )
    await user.click(screen.getByRole('option', { name: `12:00 ${period}` }))
    expect(set).toHaveBeenCalledWith(new Date(2026, 9, 31, hour).getTime())
  },
)

it('keeps task actions keyboard accessible outside the scrolling list', async () => {
  const user = userEvent.setup()
  render(<Tasks />)
  await user.type(
    screen.getByRole('textbox', { name: 'New task' }),
    'Review{Enter}',
  )
  const trigger = screen.getByRole('button', { name: 'Actions for Review' })
  await user.click(trigger)
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Edit task' }),
  )
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('button', { name: 'Edit task' })).toBeNull()
  expect(document.activeElement).toBe(trigger)
  await user.click(trigger)
  await user.click(screen.getByRole('textbox', { name: 'New task' }))
  expect(screen.queryByRole('button', { name: 'Edit task' })).toBeNull()
})

it('holds a checked task briefly and allows reopening before it disappears', () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  render(<Tasks />)
  const input = screen.getByRole('textbox', { name: 'New task' })
  fireEvent.change(input, { target: { value: 'Review notes' } })
  fireEvent.submit(input.closest('form')!)
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Complete Review notes' }),
  )
  expect(
    screen
      .getByRole('checkbox', { name: 'Reopen Review notes' })
      .getAttribute('aria-checked'),
  ).toBe('true')
  expect(document.querySelector('.tasks-completed .task-row')).toBeNull()
  act(() => {
    vi.advanceTimersByTime(1000)
  })
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reopen Review notes' }))
  act(() => {
    vi.advanceTimersByTime(3000)
  })
  expect(
    screen.getByRole('checkbox', { name: 'Complete Review notes' }),
  ).toBeTruthy()
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Complete Review notes' }),
  )
  act(() => {
    vi.advanceTimersByTime(2200)
  })
  expect(screen.getByText('Completed')).toBeTruthy()
  expect(
    screen
      .getByRole('checkbox', { name: 'Reopen Review notes' })
      .closest('.tasks-completed'),
  ).toBeTruthy()
})

it('keeps Completed mounted and delays reopening before moving the task to the top', () => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  render(<Tasks />)
  const input = screen.getByRole('textbox', { name: 'New task' })
  for (const title of ['First task', 'Second task']) {
    fireEvent.change(input, { target: { value: title } })
    fireEvent.submit(input.closest('form')!)
  }
  const group = document.querySelector('.tasks-completed')
  fireEvent.click(
    screen.getByRole('checkbox', { name: 'Complete Second task' }),
  )
  expect(document.querySelector('.tasks-completed')).toBe(group)
  act(() => {
    vi.advanceTimersByTime(2200)
  })
  fireEvent.click(screen.getByText('Completed'))
  fireEvent.click(screen.getByRole('checkbox', { name: 'Reopen Second task' }))
  expect(document.querySelector('.tasks-completed .finishing-up')).toBeTruthy()
  act(() => {
    vi.advanceTimersByTime(1000)
  })
  expect(document.querySelector('.tasks-completed .finishing-up')).toBeTruthy()
  act(() => {
    vi.advanceTimersByTime(1200)
  })
  const titles = [
    ...document.querySelectorAll('.task-body > .task-list .task-title'),
  ].map((element) => element.textContent)
  expect(titles).toEqual(['Second task', 'First task'])
  expect(document.querySelector('.tasks-completed')).toBe(group)
  expect(
    document
      .querySelector('.tasks-completed-shell')
      ?.classList.contains('is-visible'),
  ).toBe(false)
})
