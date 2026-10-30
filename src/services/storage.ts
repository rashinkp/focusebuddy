import type { ActiveSession, AppData, Settings } from '../types'
import { freshData, validAmount, validSettings } from './engine'

export const STORAGE_KEY = 'posture-buddy:data'
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
export interface LoadResult {
  data: AppData
  warning: string
  blocked: boolean
}
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const time = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 8.64e15
const id = (v: unknown): v is string => typeof v === 'string' && v.length > 0
const phases = ['working', 'due', 'break', 'ready', 'paused']

export function isData(value: unknown): value is AppData {
  if (
    !object(value) ||
    value.schemaVersion !== 2 ||
    !Number.isInteger(value.revision) ||
    Number(value.revision) < 0
  )
    return false
  if (
    !object(value.settings) ||
    !validSettings(value.settings as unknown as Settings)
  )
    return false
  if (
    !Array.isArray(value.water) ||
    !value.water.every(
      (e) =>
        object(e) &&
        id(e.id) &&
        time(e.timestamp) &&
        typeof e.amountMl === 'number' &&
        validAmount(e.amountMl),
    )
  )
    return false
  if (
    !Array.isArray(value.sessions) ||
    !value.sessions.every(
      (s) =>
        object(s) &&
        id(s.id) &&
        time(s.startedAt) &&
        (s.endedAt === null || (time(s.endedAt) && s.endedAt >= s.startedAt)) &&
        Array.isArray(s.segments) &&
        s.segments.every(
          (e) => object(e) && time(e.start) && time(e.end) && e.end >= e.start,
        ),
    )
  )
    return false
  if (
    !Array.isArray(value.breaks) ||
    !value.breaks.every(
      (b) =>
        object(b) &&
        id(b.id) &&
        time(b.timestamp) &&
        time(b.durationMs) &&
        ['completed', 'skipped', 'interrupted'].includes(String(b.status)),
    )
  )
    return false
  if (
    !Array.isArray(value.tasks) ||
    !value.tasks.every(
      (task) =>
        object(task) &&
        id(task.id) &&
        typeof task.title === 'string' &&
        task.title.trim().length > 0 &&
        task.title.length <= 200 &&
        time(task.createdAt) &&
        (task.completedAt === null || time(task.completedAt)) &&
        (task.reminderAt === null || time(task.reminderAt)) &&
        (task.reminderAt === null
          ? task.reminderStatus === null
          : ['scheduled', 'due', 'dismissed'].includes(
              String(task.reminderStatus),
            )) &&
        typeof task.notificationSent === 'boolean',
    )
  )
    return false
  if (!Array.isArray(value.notifiedEvents) || !value.notifiedEvents.every(id))
    return false
  for (const collection of [
    value.water,
    value.sessions,
    value.breaks,
    value.tasks,
  ]) {
    const ids = collection.map((e: { id: string }) => e.id)
    if (new Set(ids).size !== ids.length) return false
  }
  const open = value.sessions.filter((s) => s.endedAt === null)
  if (value.active === null) return open.length === 0
  const a = value.active
  if (
    !object(a) ||
    !id(a.sessionId) ||
    !phases.includes(String(a.phase)) ||
    !time(a.checkpoint) ||
    !time(a.remainingMs) ||
    !time(a.plannedBreakMs) ||
    !(a.deadline === null || time(a.deadline)) ||
    !(a.workStartedAt === null || time(a.workStartedAt)) ||
    !(a.dueEventId === null || id(a.dueEventId))
  )
    return false
  if (!(
    a.resumePhase === null ||
    ['working', 'due', 'break', 'ready'].includes(String(a.resumePhase))
  ))
    return false
  if (open.length !== 1 || open[0].id !== a.sessionId) return false
  if (a.phase === 'paused')
    return (
      a.resumePhase !== null && a.deadline === null && a.workStartedAt === null
    )
  if (a.resumePhase !== null) return false
  if (
    (a.phase === 'working' || a.phase === 'due') !==
    (a.workStartedAt !== null)
  )
    return false
  if ((a.phase === 'working' || a.phase === 'break') !== (a.deadline !== null))
    return false
  return true
}

export function load(storage?: StorageLike): LoadResult {
  try {
    const raw = (storage ?? localStorage).getItem(STORAGE_KEY)
    if (raw === null) return { data: freshData(), warning: '', blocked: false }
    let value: unknown = JSON.parse(raw)
    // Version 2 adds tasks; preserve every existing activity record and preference.
    if (object(value) && value.schemaVersion === 1)
      value = { ...value, schemaVersion: 2, tasks: [] }
    if (!isData(value)) throw new Error('invalid schema')
    return { data: value, warning: '', blocked: false }
  } catch (error) {
    const inaccessible =
      !(error instanceof SyntaxError) && error instanceof DOMException
    return {
      data: freshData(),
      blocked: !inaccessible,
      warning: inaccessible
        ? 'Storage is unavailable. Changes stay in this tab and may not survive a reload.'
        : 'Saved data could not be read. It has been left untouched. Reset saved data in Settings to continue.',
    }
  }
}
export function save(data: AppData, storage?: StorageLike): string {
  try {
    ;(storage ?? localStorage).setItem(STORAGE_KEY, JSON.stringify(data))
    return ''
  } catch {
    return 'Changes could not be saved. Keep this tab open; recent changes may not survive a reload.'
  }
}
export function clear(storage?: StorageLike): boolean {
  try {
    ;(storage ?? localStorage).removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}
export function isRecovering(active: ActiveSession | null, now: number) {
  return (
    active !== null &&
    active.phase !== 'paused' &&
    now - active.checkpoint > 60_000
  )
}
