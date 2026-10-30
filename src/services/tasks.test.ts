import { describe, expect, it } from 'vitest'
import { freshData, transition } from './engine'
import { isData, load, save, STORAGE_KEY } from './storage'
import { formatTime } from '../utils/time'
import { reminderTimestamp } from '../utils/taskDates'

const now = new Date(2026, 9, 30, 10).getTime()
const task = (reminderAt: number | null = now + 60_000) =>
  transition(
    freshData(),
    { type: 'task-add', id: 't1', title: '  Send the update  ', reminderAt },
    now,
  )

describe('tasks and reminder lifecycle', () => {
  it('adds a trimmed task without requiring a running session or reminder', () => {
    const data = task(null)
    expect(data.tasks[0]).toMatchObject({
      title: 'Send the update',
      reminderStatus: null,
    })
    expect(isData(data)).toBe(true)
    expect(
      transition(
        data,
        { type: 'task-add', id: 't1', title: 'Duplicate', reminderAt: null },
        now,
      ),
    ).toBe(data)
  })
  it('rejects blank or oversized titles and past or invalid reminder times', () => {
    const data = freshData()
    for (const [title, reminderAt] of [
      [' ', null],
      ['x'.repeat(201), null],
      ['Task', now],
      ['Task', NaN],
    ] as const)
      expect(
        transition(data, { type: 'task-add', id: 'x', title, reminderAt }, now),
      ).toBe(data)
  })
  it('marks due reminders on time even without a session, then keeps them across reloads', () => {
    const data = task()
    expect(transition(data, { type: 'tick' }, now + 59_999)).toBe(data)
    const due = transition(data, { type: 'tick' }, now + 60_000)
    expect(due.tasks[0].reminderStatus).toBe('due')
    expect(transition(due, { type: 'tick' }, now + 70_000)).toBe(due)
    save(due)
    expect(load().data.tasks).toEqual(due.tasks)
  })
  it('finds all missed reminders on return and recovers an inactive work session independently', () => {
    let data = transition(task(), { type: 'start' }, now)
    data = transition(
      data,
      {
        type: 'task-add',
        id: 't2',
        title: 'Review',
        reminderAt: now + 120_000,
      },
      now,
    )
    const returned = transition(data, { type: 'tick' }, now + 86_400_000)
    expect(returned.tasks.every((t) => t.reminderStatus === 'due')).toBe(true)
    expect(returned.active?.phase).toBe('paused')
  })
  it('snoozes for ten minutes, dismisses without completing, and never replays a dismissal', () => {
    let data = transition(task(), { type: 'tick' }, now + 60_000)
    data = transition(data, { type: 'task-notified', id: 't1' }, now + 60_000)
    data = transition(data, { type: 'task-snooze', id: 't1' }, now + 60_000)
    expect(data.tasks[0]).toMatchObject({
      reminderAt: now + 660_000,
      reminderStatus: 'scheduled',
      notificationSent: false,
    })
    data = transition(data, { type: 'tick' }, now + 660_000)
    data = transition(data, { type: 'task-dismiss', id: 't1' }, now + 660_000)
    data = transition(data, { type: 'tick' }, now + 1_000_000)
    expect(data.tasks[0]).toMatchObject({
      completedAt: null,
      reminderStatus: 'dismissed',
    })
  })
  it('completion cancels the reminder and reopening does not reschedule it', () => {
    let data = transition(task(), { type: 'task-toggle', id: 't1' }, now)
    data = transition(data, { type: 'tick' }, now + 60_000)
    expect(data.tasks[0].completedAt).toBe(now)
    data = transition(data, { type: 'task-toggle', id: 't1' }, now + 70_000)
    expect(data.tasks[0]).toMatchObject({
      completedAt: null,
      reminderStatus: 'dismissed',
    })
  })
  it('edits title without replaying an old reminder, reschedules explicitly, and deletes', () => {
    let data = transition(task(), { type: 'tick' }, now + 60_000)
    data = transition(
      data,
      {
        type: 'task-edit',
        id: 't1',
        title: 'New title',
        reminderAt: now + 60_000,
      },
      now + 70_000,
    )
    expect(data.tasks[0].reminderStatus).toBe('due')
    data = transition(
      data,
      {
        type: 'task-edit',
        id: 't1',
        title: 'New title',
        reminderAt: now + 100_000,
      },
      now + 70_000,
    )
    expect(data.tasks[0].reminderStatus).toBe('scheduled')
    expect(
      transition(data, { type: 'task-delete', id: 't1' }, now).tasks,
    ).toEqual([])
  })
  it('preserves tasks when resetting today and keeps exact reminders over local midnight', () => {
    const data = task(now + 86_400_000)
    expect(transition(data, { type: 'reset-today' }, now).tasks).toEqual(
      data.tasks,
    )
    expect(
      transition(data, { type: 'tick' }, now + 86_400_000).tasks[0]
        .reminderStatus,
    ).toBe('due')
  })
})

describe('task storage migration and validation', () => {
  it('migrates version 1 without changing original storage or losing activity and settings', () => {
    const previous = transition(
      freshData(),
      { type: 'water-add', id: 'w', amount: 250 },
      now,
    )
    const { tasks: _tasks, ...legacy } = previous
    void _tasks
    const raw = JSON.stringify({ ...legacy, schemaVersion: 1 })
    localStorage.setItem(STORAGE_KEY, raw)
    const result = load()
    expect(result.blocked).toBe(false)
    expect(result.data).toEqual({ ...previous, tasks: [] })
    expect(localStorage.getItem(STORAGE_KEY)).toBe(raw)
  })
  it('rejects malformed tasks, duplicate IDs, and inconsistent reminders', () => {
    const data = task()
    for (const changed of [
      { title: '' },
      { reminderAt: 'tomorrow' },
      { reminderStatus: 'invalid' },
      { notificationSent: 'yes' },
      { reminderAt: null, reminderStatus: 'due' },
    ])
      expect(
        isData({ ...data, tasks: [{ ...data.tasks[0], ...changed }] }),
      ).toBe(false)
    expect(isData({ ...data, tasks: [...data.tasks, ...data.tasks] })).toBe(
      false,
    )
  })
  it('parses local times strictly instead of rolling invalid dates', () => {
    expect(reminderTimestamp('2026-10-30', '14:30')).toBe(
      new Date(2026, 9, 30, 14, 30).getTime(),
    )
    expect(reminderTimestamp('2026-02-30', '14:30')).toBeNull()
    expect(reminderTimestamp('2026-10-30', '25:30')).toBeNull()
  })
})

it('formats midnight, noon, and afternoon clock times with AM/PM', () => {
  expect(formatTime(new Date(2026, 9, 30, 0, 5).getTime())).toBe('12:05 AM')
  expect(formatTime(new Date(2026, 9, 30, 12, 0).getTime())).toBe('12:00 PM')
  expect(formatTime(new Date(2026, 9, 30, 15, 30).getTime())).toBe('3:30 PM')
})
