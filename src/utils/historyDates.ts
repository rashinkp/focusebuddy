import { dayBounds, dayKey } from './time'

export interface DateRange {
  start: string
  end: string
}
export type HistoryPreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom'
export interface HistoryFilter {
  preset: HistoryPreset
  custom?: DateRange
}
export const presetLabels: Record<HistoryPreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last week',
  month: 'Last month',
  custom: 'Custom dates',
}

export function parseDay(key: string) {
  const date = new Date(`${key}T12:00:00`)
  return /^\d{4}-\d{2}-\d{2}$/.test(key) &&
    Number.isFinite(date.getTime()) &&
    dayKey(date.getTime()) === key
    ? date
    : null
}
export function historyRange(filter: HistoryFilter, now: number): DateRange {
  const start = new Date(now)
  const end = new Date(now)
  if (
    filter.preset === 'custom' &&
    filter.custom &&
    validRange(filter.custom, now)
  )
    return filter.custom
  if (filter.preset === 'yesterday') {
    start.setDate(start.getDate() - 1)
    end.setDate(end.getDate() - 1)
  }
  if (filter.preset === 'week') {
    start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7)
    end.setTime(start.getTime())
    end.setDate(end.getDate() + 6)
  }
  if (filter.preset === 'month') {
    start.setDate(1)
    start.setMonth(start.getMonth() - 1)
    end.setDate(0)
  }
  return { start: dayKey(start.getTime()), end: dayKey(end.getTime()) }
}
export function validRange(range: DateRange, now: number) {
  return (
    !!parseDay(range.start) &&
    !!parseDay(range.end) &&
    range.start <= range.end &&
    range.end <= dayKey(now)
  )
}
export function rangeBounds(range: DateRange): [number, number] {
  return [
    dayBounds(parseDay(range.start)!.getTime())[0],
    dayBounds(parseDay(range.end)!.getTime())[1],
  ]
}
export function rangeLabel(range: DateRange) {
  const format = (key: string) =>
    parseDay(key)!.toLocaleDateString([], {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  return range.start === range.end
    ? format(range.start)
    : `${format(range.start)} – ${format(range.end)}`
}
