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
  await user.click(
    screen.getByRole('checkbox', { name: 'Complete Send update' }),
  )
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
  await user.click(screen.getByRole('button', { name: 'Tomorrow' }))
  await user.selectOptions(screen.getByLabelText('Reminder hour'), '9')
  await user.selectOptions(screen.getByLabelText('Reminder minute'), '30')
  await user.selectOptions(screen.getByLabelText('AM or PM'), 'AM')
  await user.click(screen.getByRole('button', { name: 'Set reminder' }))
  expect(screen.getByText(/Tomorrow,/)).toBeTruthy()
  await user.click(screen.getByRole('button', { name: 'Remove reminder' }))
  expect(screen.queryByText(/Tomorrow,/)).toBeNull()
})
it('rejects past picker times and cancels without changing the task draft', async () => {
  const set = vi.fn()
  const close = vi.fn()
  const user = userEvent.setup()
  render(
    <TaskReminderPicker now={now} value={null} onSet={set} onClose={close} />,
  )
  await user.selectOptions(screen.getByLabelText('Reminder hour'), '9')
  await user.selectOptions(screen.getByLabelText('Reminder minute'), '30')
  await user.selectOptions(screen.getByLabelText('AM or PM'), 'AM')
  expect(
    (screen.getByRole('button', { name: 'Set reminder' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Custom' }))
  fireEvent.change(screen.getByLabelText('Reminder date'), {
    target: { value: '2026-11-02' },
  })
  expect(
    (screen.getByRole('button', { name: 'Set reminder' }) as HTMLButtonElement)
      .disabled,
  ).toBe(false)
  await user.click(screen.getByRole('button', { name: 'Cancel' }))
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
    await user.click(screen.getByRole('button', { name: 'Tomorrow' }))
    await user.selectOptions(screen.getByLabelText('Reminder hour'), '12')
    await user.selectOptions(screen.getByLabelText('Reminder minute'), '0')
    await user.selectOptions(screen.getByLabelText('AM or PM'), period)
    await user.click(screen.getByRole('button', { name: 'Set reminder' }))
    expect(set).toHaveBeenCalledWith(new Date(2026, 9, 31, hour).getTime())
  },
)
