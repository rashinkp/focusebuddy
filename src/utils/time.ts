import type { AppData, WorkSession } from '../types'

export const MINUTE = 60_000
export function dayBounds(timestamp: number): [number, number] {
  const day = new Date(timestamp)
  day.setHours(0, 0, 0, 0)
  const next = new Date(day)
  next.setDate(next.getDate() + 1)
  return [day.getTime(), next.getTime()]
}
export function dayKey(timestamp: number) {
  const date = new Date(timestamp)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
export const inDay = (timestamp: number, day: number) => {
  const [start, end] = dayBounds(day)
  return timestamp >= start && timestamp < end
}
export function workDuration(
  data: AppData,
  now: number,
  day?: number,
  session?: WorkSession,
) {
  const [start, end] =
    day === undefined ? [-Infinity, Infinity] : dayBounds(day)
  const overlap = (a: number, b: number) =>
    Math.max(0, Math.min(b, end) - Math.max(a, start))
  const sessions = session ? [session] : data.sessions
  let total = sessions.reduce(
    (sum, item) =>
      sum +
      item.segments.reduce(
        (n, segment) => n + overlap(segment.start, segment.end),
        0,
      ),
    0,
  )
  if (
    data.active?.workStartedAt != null &&
    (!session || data.active.sessionId === session.id)
  ) {
    total += overlap(data.active.workStartedAt, now)
  }
  return total
}
export function clock(ms: number) {
  const seconds = Math.max(0, Math.ceil(ms / 1000))
  const h = Math.floor(seconds / 3600)
  return `${h ? `${String(h).padStart(2, '0')}:` : ''}${String(Math.floor(seconds / 60) % 60).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`
}
export function duration(ms: number) {
  const minutes = Math.floor(ms / MINUTE)
  return minutes >= 60
    ? `${Math.floor(minutes / 60)}h ${minutes % 60}m`
    : `${minutes} min`
}
