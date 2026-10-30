import {
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { formatTime } from '../utils/time'
import { reminderTimestamp } from '../utils/taskDates'

export function ReminderTimeList({
  date,
  value,
  now,
  onChange,
}: {
  date: string
  value: string
  now: number
  onChange: (value: string) => void
}) {
  const id = useId()
  const list = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(value)
  const times = Array.from({ length: 288 }, (_, index) => {
    const minutes = index * 5
    return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
  })
  // Keep an existing reminder's exact minute available when editing older data.
  if (!times.includes(value)) times.push(value)
  const options = times.sort().flatMap((time) => {
    const at = reminderTimestamp(date, time)
    return at !== null && (at > now || time === value)
      ? [{ value: time, label: formatTime(at), disabled: at <= now }]
      : []
  })
  const enabled = options.filter((option) => !option.disabled)
  const activeValue = enabled.some((option) => option.value === active)
    ? active
    : enabled[0]?.value
  useLayoutEffect(() => {
    setActive(value)
    const revealSelected = () => {
      const element = list.current?.querySelector<HTMLElement>(`[data-time="${value}"]`) ?? list.current?.querySelector<HTMLElement>('button:not(:disabled)')
      if (list.current?.clientHeight && element) list.current.scrollTop = element.offsetTop - (list.current.clientHeight - element.offsetHeight) / 2
    }
    revealSelected()
    // The dialog opens after child layout effects, so reveal the selection when
    // the list first becomes visible rather than measuring a closed dialog.
    if (typeof ResizeObserver === 'undefined' || !list.current) return
    const observer = new ResizeObserver(revealSelected)
    observer.observe(list.current)
    return () => observer.disconnect()
  }, [date, value])
  const keyDown = (event: KeyboardEvent) => {
    if (!enabled.length) return
    const index = Math.max(
      0,
      enabled.findIndex((option) => option.value === activeValue),
    )
    const offsets: Record<string, number> = {
      ArrowDown: 1,
      ArrowUp: -1,
      PageDown: 6,
      PageUp: -6,
    }
    if (event.key in offsets || event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const next =
        enabled[
          event.key === 'Home'
            ? 0
            : event.key === 'End'
              ? enabled.length - 1
              : Math.max(
                  0,
                  Math.min(enabled.length - 1, index + offsets[event.key]),
                )
        ]
      setActive(next.value)
      const element = list.current?.querySelector<HTMLElement>(
        `[data-time="${next.value}"]`,
      )
      if (element && list.current) {
        if (element.offsetTop < list.current.scrollTop)
          list.current.scrollTop = element.offsetTop
        else if (
          element.offsetTop + element.offsetHeight >
          list.current.scrollTop + list.current.clientHeight
        )
          list.current.scrollTop =
            element.offsetTop + element.offsetHeight - list.current.clientHeight
      }
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      if (activeValue) onChange(activeValue)
    }
  }
  return (
    <div
      ref={list}
      className="reminder-time-list"
      role="listbox"
      aria-label="Reminder time"
      tabIndex={0}
      aria-activedescendant={
        activeValue ? `${id}-${activeValue.replace(':', '')}` : undefined
      }
      onKeyDown={keyDown}
    >
      {options.map((option) => (
        <button
          type="button"
          role="option"
          id={`${id}-${option.value.replace(':', '')}`}
          key={option.value}
          data-time={option.value}
          tabIndex={-1}
          aria-selected={value === option.value}
          disabled={option.disabled}
          className={activeValue === option.value ? 'is-active' : ''}
          onClick={() => {
            setActive(option.value)
            onChange(option.value)
          }}
        >
          <span>{option.label}</span>
        </button>
      ))}
      {!enabled.length && (
        <p className="no-reminder-times">
          No times left today.
          <br />
          Choose another date.
        </p>
      )}
    </div>
  )
}
