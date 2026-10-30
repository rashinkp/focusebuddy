import { dayKey, formatTime } from './time'

export function taskReminderLabel(at: number, now: number): string {
  const date = new Date(at)
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const day =
    dayKey(at) === dayKey(now)
      ? 'Today'
      : dayKey(at) === dayKey(tomorrow.getTime())
        ? 'Tomorrow'
        : date.toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
            ...(date.getFullYear() !== new Date(now).getFullYear()
              ? { year: 'numeric' }
              : {}),
          })
  return `${day}, ${formatTime(at)}`
}

export function reminderTimestamp(date: string, time: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null
  const [year, month, day] = date.split('-').map(Number)
  const [hour, minute] = time.split(':').map(Number)
  const value = new Date(year, month - 1, day, hour, minute)
  // Reject invalid calendar values and nonexistent times during DST changes.
  return value.getFullYear() === year &&
    value.getMonth() === month - 1 &&
    value.getDate() === day &&
    value.getHours() === hour &&
    value.getMinutes() === minute
    ? value.getTime()
    : null
}
