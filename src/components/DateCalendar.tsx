import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { dayKey } from '../utils/time'
import { parseDay } from '../utils/historyDates'

/** Single-day counterpart to the History calendar, using the same visual language. */
export function DateCalendar({
  value,
  min,
  today,
  onChange,
}: {
  value: string
  min: string
  today: string
  onChange: (day: string) => void
}) {
  const [month, setMonth] = useState(value.slice(0, 7))
  const [focused, setFocused] = useState(value)
  const grid = useRef<HTMLDivElement>(null)
  const moveFocus = useRef(false)
  useEffect(() => {
    setMonth(value.slice(0, 7))
    setFocused(value)
  }, [value])
  const first = parseDay(`${month}-01`)!
  const firstCell = new Date(first)
  firstCell.setDate(1 - ((first.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, i) => {
    const date = new Date(firstCell)
    date.setDate(date.getDate() + i)
    return { date, key: dayKey(date.getTime()) }
  })
  const tabStop = days.some((day) => day.key === focused && day.key >= min)
    ? focused
    : days.find((day) => day.key >= min)?.key
  useEffect(() => {
    if (moveFocus.current) {
      grid.current
        ?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)
        ?.focus()
      moveFocus.current = false
    }
  }, [focused, month])
  const changeMonth = (offset: number) => {
    const date = new Date(first)
    date.setMonth(date.getMonth() + offset)
    if (date.getFullYear() < 1000 || date.getFullYear() > 9999) return
    setMonth(dayKey(date.getTime()).slice(0, 7))
  }
  const keyDown = (event: KeyboardEvent, key: string) => {
    const date = parseDay(key)!
    const offsets: Record<string, number> = {
      ArrowLeft: -1,
      ArrowRight: 1,
      ArrowUp: -7,
      ArrowDown: 7,
      Home: -((date.getDay() + 6) % 7),
      End: 6 - ((date.getDay() + 6) % 7),
    }
    if (
      !(event.key in offsets) &&
      event.key !== 'PageUp' &&
      event.key !== 'PageDown'
    )
      return
    event.preventDefault()
    if (event.key === 'PageUp' || event.key === 'PageDown') {
      const day = date.getDate()
      date.setDate(1)
      date.setMonth(date.getMonth() + (event.key === 'PageUp' ? -1 : 1))
      date.setDate(
        Math.min(
          day,
          new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate(),
        ),
      )
    } else date.setDate(date.getDate() + offsets[event.key])
    const next = dayKey(date.getTime())
    if (next < min || date.getFullYear() > 9999 || date.getFullYear() < 1000)
      return
    moveFocus.current = true
    setFocused(next)
    setMonth(next.slice(0, 7))
  }
  return (
    <div className="reminder-calendar">
      <div className="calendar-heading">
        <button
          type="button"
          className="icon-button"
          aria-label="Previous month"
          disabled={month <= min.slice(0, 7)}
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft size={17} />
        </button>
        <h3 aria-live="polite">
          {first.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </h3>
        <button
          type="button"
          className="icon-button"
          aria-label="Next month"
          disabled={month === '9999-12'}
          onClick={() => changeMonth(1)}
        >
          <ChevronRight size={17} />
        </button>
      </div>
      <div className="calendar-weekdays" aria-hidden="true">
        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((day) => (
          <span key={day}>{day}</span>
        ))}
      </div>
      <div
        ref={grid}
        className="calendar-days"
        role="group"
        aria-label="Reminder date"
      >
        {days.map(({ date, key }) => (
          <button
            type="button"
            key={key}
            data-day={key}
            className={`calendar-day ${key.slice(0, 7) !== month ? 'outside-month' : ''} ${key === value ? 'range-edge' : ''} ${key === today ? 'is-today' : ''}`}
            disabled={key < min}
            tabIndex={key === tabStop ? 0 : -1}
            aria-label={date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
            aria-pressed={key === value}
            aria-current={key === today ? 'date' : undefined}
            onClick={() => {
              setFocused(key)
              setMonth(key.slice(0, 7))
              onChange(key)
            }}
            onKeyDown={(event) => keyDown(event, key)}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
    </div>
  )
}
