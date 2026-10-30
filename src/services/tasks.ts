import type { Task } from '../types'

export type TaskAction =
  | { type: 'task-add'; id: string; title: string; reminderAt: number | null }
  | { type: 'task-edit'; id: string; title: string; reminderAt: number | null }
  | {
      type:
        | 'task-toggle'
        | 'task-delete'
        | 'task-dismiss'
        | 'task-snooze'
        | 'task-notified'
      id: string
    }

export const validTitle = (title: string) =>
  title.trim().length > 0 && title.trim().length <= 200
export const futureReminder = (at: number | null, now: number) =>
  at === null || (Number.isFinite(at) && at > now && at <= 8.64e15)

export function tickTasks(tasks: Task[], now: number): Task[] {
  if (
    !tasks.some(
      (t) =>
        t.completedAt === null &&
        t.reminderStatus === 'scheduled' &&
        t.reminderAt! <= now,
    )
  )
    return tasks
  return tasks.map((t) =>
    t.completedAt === null &&
    t.reminderStatus === 'scheduled' &&
    t.reminderAt! <= now
      ? { ...t, reminderStatus: 'due' }
      : t,
  )
}

export function taskTransition(
  tasks: Task[],
  action: TaskAction,
  now: number,
): Task[] {
  const task = tasks.find((t) => t.id === action.id)
  if (action.type === 'task-add') {
    if (
      task ||
      !action.id ||
      !validTitle(action.title) ||
      !futureReminder(action.reminderAt, now)
    )
      return tasks
    return [
      ...tasks,
      {
        id: action.id,
        title: action.title.trim(),
        createdAt: now,
        completedAt: null,
        reminderAt: action.reminderAt,
        reminderStatus: action.reminderAt === null ? null : 'scheduled',
        notificationSent: false,
      },
    ]
  }
  if (!task) return tasks
  if (action.type === 'task-delete')
    return tasks.filter((t) => t.id !== task.id)
  let changed: Task
  switch (action.type) {
    case 'task-edit': {
      const rescheduled = action.reminderAt !== task.reminderAt
      if (
        !validTitle(action.title) ||
        (rescheduled && !futureReminder(action.reminderAt, now))
      )
        return tasks
      changed = {
        ...task,
        title: action.title.trim(),
        reminderAt: action.reminderAt,
        ...(rescheduled
          ? {
              reminderStatus: action.reminderAt === null ? null : 'scheduled',
              notificationSent: false,
            }
          : {}),
      }
      break
    }
    case 'task-toggle':
      changed = {
        ...task,
        completedAt: task.completedAt === null ? now : null,
        reminderStatus: task.reminderAt === null ? null : 'dismissed',
      }
      break
    case 'task-dismiss':
      if (task.reminderStatus !== 'due') return tasks
      changed = { ...task, reminderStatus: 'dismissed' }
      break
    case 'task-snooze':
      if (task.completedAt !== null || task.reminderStatus !== 'due')
        return tasks
      changed = {
        ...task,
        reminderAt: now + 600_000,
        reminderStatus: 'scheduled',
        notificationSent: false,
      }
      break
    case 'task-notified':
      if (task.reminderStatus !== 'due' || task.notificationSent) return tasks
      changed = { ...task, notificationSent: true }
      break
    default:
      return tasks
  }
  return tasks.map((t) => (t.id === task.id ? changed : t))
}
