import type { ActiveSession, AppData, LivePhase, Settings } from '../types'
import { taskTransition, type TaskAction, tickTasks } from './tasks'
import { dayBounds, inDay, MINUTE } from '../utils/time'

export const defaults: Settings = {
  dailyWaterGoalMl: 2000,
  workIntervalMinutes: 45,
  breakDurationMinutes: 5,
  notificationsEnabled: false,
}
export const freshData = (): AppData => ({
  schemaVersion: 2,
  tasks: [],
  revision: 0,
  water: [],
  sessions: [],
  breaks: [],
  settings: { ...defaults },
  active: null,
  notifiedEvents: [],
})
export const validAmount = (value: number) =>
  Number.isInteger(value) && value >= 1 && value <= 2000
export const validSettings = (s: Settings) =>
  Number.isInteger(s.dailyWaterGoalMl) &&
  s.dailyWaterGoalMl >= 250 &&
  s.dailyWaterGoalMl <= 10000 &&
  Number.isInteger(s.workIntervalMinutes) &&
  s.workIntervalMinutes >= 1 &&
  s.workIntervalMinutes <= 180 &&
  Number.isInteger(s.breakDurationMinutes) &&
  s.breakDurationMinutes >= 1 &&
  s.breakDurationMinutes <= 60 &&
  typeof s.notificationsEnabled === 'boolean'
export type Action =
  | TaskAction
  | { type: 'water-add'; amount: number; id: string }
  | { type: 'water-edit'; id: string; amount: number }
  | { type: 'water-delete'; id: string }
  | { type: 'settings'; settings: Settings }
  | { type: 'notified'; id: string }
  | {
      type:
        | 'start'
        | 'pause'
        | 'resume'
        | 'end'
        | 'reset-countdown'
        | 'start-break'
        | 'snooze'
        | 'skip'
        | 'complete-break'
        | 'end-break'
        | 'tick'
        | 'reset-today'
    }

const remaining = (a: ActiveSession, now: number) =>
  a.deadline === null ? a.remainingMs : Math.max(0, a.deadline - now)
function closeWork(data: AppData, now: number) {
  const active = data.active
  if (active?.workStartedAt == null) return
  const session = data.sessions.find((s) => s.id === active.sessionId)!
  if (now > active.workStartedAt)
    session.segments.push({ start: active.workStartedAt, end: now })
  active.workStartedAt = null
}
function pause(data: AppData, now: number) {
  const a = data.active!
  closeWork(data, now)
  a.remainingMs = remaining(a, now)
  a.resumePhase = a.phase as LivePhase
  a.phase = 'paused'
  a.deadline = null
  a.dueEventId = null
}
function newInterval(data: AppData, now: number) {
  const a = data.active!
  a.phase = 'working'
  a.resumePhase = null
  a.remainingMs = data.settings.workIntervalMinutes * MINUTE
  a.deadline = now + a.remainingMs
  a.dueEventId = null
  a.plannedBreakMs = 0
  if (a.workStartedAt === null) a.workStartedAt = now
}
function recordBreak(
  data: AppData,
  now: number,
  status: 'completed' | 'interrupted' | 'skipped',
) {
  const a = data.active!
  data.breaks.push({
    id: crypto.randomUUID(),
    timestamp: now,
    durationMs:
      status === 'skipped'
        ? 0
        : Math.max(0, a.plannedBreakMs - remaining(a, now)),
    status,
  })
}
function end(data: AppData, now: number) {
  const a = data.active!
  const phase = a.phase === 'paused' ? a.resumePhase : a.phase
  if (phase === 'break' || phase === 'ready')
    recordBreak(data, now, 'interrupted')
  closeWork(data, now)
  data.sessions.find((s) => s.id === a.sessionId)!.endedAt = now
  data.active = null
}

/** A single timestamp-driven transition function shared by UI, recovery, and tests. */
function sessionTransition(
  input: AppData,
  action: Action,
  now: number,
): AppData {
  const data: AppData = structuredClone(input)
  const a = data.active
  if (action.type === 'water-add') {
    if (
      !validAmount(action.amount) ||
      data.water.some((e) => e.id === action.id)
    )
      return input
    data.water.push({ id: action.id, timestamp: now, amountMl: action.amount })
  } else if (action.type === 'water-edit') {
    const entry = data.water.find((e) => e.id === action.id)
    if (!entry || !validAmount(action.amount)) return input
    entry.amountMl = action.amount
  } else if (action.type === 'water-delete') {
    if (!data.water.some((e) => e.id === action.id)) return input
    data.water = data.water.filter((e) => e.id !== action.id)
  } else if (action.type === 'settings') {
    if (!validSettings(action.settings)) return input
    data.settings = { ...action.settings }
  } else if (action.type === 'notified') {
    if (data.notifiedEvents.includes(action.id)) return input
    data.notifiedEvents = [...data.notifiedEvents.slice(-99), action.id]
  } else if (action.type === 'start') {
    if (a) return input
    const id = crypto.randomUUID()
    data.sessions.push({ id, startedAt: now, endedAt: null, segments: [] })
    data.active = {
      sessionId: id,
      phase: 'working',
      resumePhase: null,
      deadline: now + data.settings.workIntervalMinutes * MINUTE,
      remainingMs: data.settings.workIntervalMinutes * MINUTE,
      plannedBreakMs: 0,
      workStartedAt: now,
      checkpoint: now,
      dueEventId: null,
    }
  } else if (action.type === 'reset-today') {
    if (a) end(data, now)
    const [start, finish] = dayBounds(now)
    data.water = data.water.filter((e) => !inDay(e.timestamp, now))
    data.breaks = data.breaks.filter((e) => !inDay(e.timestamp, now))
    data.sessions = data.sessions
      .map((s) => ({
        ...s,
        segments: s.segments.flatMap((segment) => {
          if (segment.end <= start || segment.start >= finish) return [segment]
          return [
            ...(segment.start < start
              ? [{ start: segment.start, end: start }]
              : []),
            ...(segment.end > finish
              ? [{ start: finish, end: segment.end }]
              : []),
          ]
        }),
      }))
      .filter((s) => s.segments.length > 0)
  } else {
    if (!a) return input
    switch (action.type) {
      case 'tick': {
        if (a.phase !== 'paused' && now - a.checkpoint > 60_000) {
          pause(data, a.checkpoint)
        } else if (
          a.phase === 'working' &&
          a.deadline !== null &&
          now >= a.deadline
        ) {
          a.phase = 'due'
          a.deadline = null
          a.remainingMs = 0
          a.dueEventId = crypto.randomUUID()
        } else if (
          a.phase === 'break' &&
          a.deadline !== null &&
          now >= a.deadline
        ) {
          a.phase = 'ready'
          a.deadline = null
          a.remainingMs = 0
        } else if (now - a.checkpoint < 15_000) return input
        a.checkpoint = now
        break
      }
      case 'pause':
        if (a.phase === 'paused') return input
        pause(data, now)
        break
      case 'resume': {
        if (a.phase !== 'paused' || !a.resumePhase) return input
        a.phase = a.resumePhase
        a.resumePhase = null
        if (a.phase === 'working' || a.phase === 'break')
          a.deadline = now + a.remainingMs
        if (a.phase === 'working' || a.phase === 'due') a.workStartedAt = now
        // A due reminder stays visible, but resuming does not send a second notification.
        break
      }
      case 'end':
        end(data, now)
        break
      case 'reset-countdown':
        if (a.phase !== 'working' && a.phase !== 'due') return input
        newInterval(data, now)
        break
      case 'start-break':
        if (a.phase !== 'due') return input
        closeWork(data, now)
        a.phase = 'break'
        a.plannedBreakMs = data.settings.breakDurationMinutes * MINUTE
        a.remainingMs = a.plannedBreakMs
        a.deadline = now + a.remainingMs
        a.dueEventId = null
        break
      case 'snooze':
        if (a.phase !== 'due') return input
        newInterval(data, now)
        a.remainingMs = 5 * MINUTE
        a.deadline = now + a.remainingMs
        break
      case 'skip':
        if (a.phase !== 'due') return input
        recordBreak(data, now, 'skipped')
        newInterval(data, now)
        break
      case 'complete-break':
        if (a.phase !== 'ready') return input
        recordBreak(data, now, 'completed')
        newInterval(data, now)
        break
      case 'end-break':
        if (a.phase !== 'break') return input
        recordBreak(data, now, 'interrupted')
        newInterval(data, now)
        break
      default:
        return input
    }
    if (data.active) data.active.checkpoint = now
  }
  data.revision++
  return data
}

export function transition(
  input: AppData,
  action: Action,
  now: number,
): AppData {
  if (action.type.startsWith('task-')) {
    const tasks = taskTransition(input.tasks, action as TaskAction, now)
    return tasks === input.tasks
      ? input
      : { ...input, tasks, revision: input.revision + 1 }
  }
  const tasks =
    action.type === 'tick' ? tickTasks(input.tasks, now) : input.tasks
  const checked =
    tasks === input.tasks
      ? input
      : { ...input, tasks, revision: input.revision + 1 }
  return sessionTransition(checked, action, now)
}
