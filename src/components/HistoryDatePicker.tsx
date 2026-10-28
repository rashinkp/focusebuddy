import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import {
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Modal } from './Modal'
import { dayKey } from '../utils/time'
import {
  historyRange,
  parseDay,
  presetLabels,
  rangeLabel,
  validRange,
  type DateRange,
  type HistoryFilter,
  type HistoryPreset,
} from '../utils/historyDates'

const fullDate = (key: string) =>
  parseDay(key)!.toLocaleDateString([], {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
const monthKey = (date: Date) => dayKey(date.getTime()).slice(0, 7)

export function HistoryDatePicker({
  value,
  now,
  onChange,
}: {
  value: HistoryFilter
  now: number
  onChange: (filter: HistoryFilter) => void
}) {
  const menu = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const [open, setOpen] = useState(false)
  const [customOpen, setCustomOpen] = useState(false)
  const range = historyRange(value, now)
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      if (!trigger.current || !menu.current) return
      const anchor = trigger.current.getBoundingClientRect()
      const box = menu.current.getBoundingClientRect()
      setPosition({
        top: Math.max(
          12,
          Math.min(anchor.bottom + 8, window.innerHeight - box.height - 12),
        ),
        left: Math.max(
          12,
          Math.min(
            anchor.right - box.width,
            document.documentElement.clientWidth - box.width - 12,
          ),
        ),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])
  return (
    <div className="history-filter">
      <button
        ref={trigger}
        className="date-filter-trigger"
        popoverTarget="history-date-presets"
        aria-expanded={open}
        aria-controls="history-date-presets"
        aria-label={`History dates: ${presetLabels[value.preset]}, ${rangeLabel(range)}`}
        title={rangeLabel(range)}
      >
        <CalendarDays size={16} />
        <span>
          <strong>{value.preset === 'custom' ? rangeLabel(range) : presetLabels[value.preset]}</strong>
        </span>
        <ChevronDown size={14} />
      </button>
      <div
        ref={menu}
        id="history-date-presets"
        popover="auto"
        className="date-presets"
        style={position}
        onToggle={(event) => setOpen(event.newState === 'open')}
      >
        {(Object.keys(presetLabels) as HistoryPreset[]).map((preset) => (
          <button
            key={preset}
            onClick={() => {
              menu.current?.hidePopover()
              trigger.current?.focus()
              if (preset === 'custom') setCustomOpen(true)
              else onChange({ preset })
            }}
            aria-pressed={value.preset === preset}
          >
            <span>{presetLabels[preset]}</span>
            {value.preset === preset && <Check size={15} />}
          </button>
        ))}
      </div>
      {customOpen && (
        <RangeCalendar
          initial={range}
          now={now}
          onClose={() => setCustomOpen(false)}
          onApply={(selected) => {
            onChange({ preset: 'custom', custom: selected })
            setCustomOpen(false)
          }}
        />
      )}
    </div>
  )
}

export function RangeCalendar({
  initial,
  now,
  onClose,
  onApply,
}: {
  initial: DateRange
  now: number
  onClose: () => void
  onApply: (range: DateRange) => void
}) {
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState<string | null>(initial.end)
  const [month, setMonth] = useState(monthKey(parseDay(initial.start)!))
  const [focused, setFocused] = useState(initial.start)
  const focusPending = useRef(false)
  const grid = useRef<HTMLDivElement>(null)
  const today = dayKey(now)
  const first = parseDay(`${month}-01`)!
  const firstCell = new Date(first)
  firstCell.setDate(1 - ((first.getDay() + 6) % 7))
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstCell)
    date.setDate(date.getDate() + index)
    return { date, key: dayKey(date.getTime()) }
  })
  const visibleFocus = days.some((day) => day.key === focused)
    ? focused
    : `${month}-01`
  useEffect(() => {
    if (!focusPending.current) return
    grid.current
      ?.querySelector<HTMLButtonElement>(`[data-day="${focused}"]`)
      ?.focus()
    focusPending.current = false
  }, [focused, month])
  const changeMonth = (offset: number) => {
    const next = new Date(first)
    next.setMonth(next.getMonth() + offset)
    setMonth(monthKey(next))
  }
  const choose = (key: string) => {
    setFocused(key)
    if (end !== null) {
      setStart(key)
      setEnd(null)
    } else if (key < start) {
      setEnd(start)
      setStart(key)
    } else setEnd(key)
  }
  const keyDown = (event: KeyboardEvent<HTMLButtonElement>, key: string) => {
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
      const last = new Date(
        date.getFullYear(),
        date.getMonth() + 1,
        0,
      ).getDate()
      date.setDate(Math.min(day, last))
    } else date.setDate(date.getDate() + offsets[event.key])
    const next = dayKey(date.getTime())
    if (next > today) return
    focusPending.current = true
    setMonth(monthKey(date))
    setFocused(next)
  }
  const selected = end ? { start, end } : null
  return (
    <Modal title="Custom date range" onClose={onClose}>
      <p className="modal-intro">
        Choose a start and end date in the same calendar.
      </p>
      <div className="range-selection">
        <div>
          <span>Start date</span>
          <strong>{rangeLabel({ start, end: start })}</strong>
        </div>
        <span className="range-dash">–</span>
        <div>
          <span>End date</span>
          <strong>
            {end ? rangeLabel({ start: end, end }) : 'Select a date'}
          </strong>
        </div>
      </div>
      <div className="calendar-heading">
        <button
          className="icon-button"
          aria-label="Previous month"
          onClick={() => changeMonth(-1)}
        >
          <ChevronLeft size={18} />
        </button>
        <h3 aria-live="polite">
          {first.toLocaleDateString([], { month: 'long', year: 'numeric' })}
        </h3>
        <button
          className="icon-button"
          aria-label="Next month"
          disabled={month >= today.slice(0, 7)}
          onClick={() => changeMonth(1)}
        >
          <ChevronRight size={18} />
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
        aria-label="Select date range"
      >
        {days.map(({ date, key }) => (
          <button
            key={key}
            type="button"
            data-day={key}
            className={`calendar-day ${key.slice(0, 7) !== month ? 'outside-month' : ''} ${end && key > start && key < end ? 'in-range' : ''} ${key === start || key === end ? 'range-edge' : ''} ${key === today ? 'is-today' : ''}`}
            disabled={key > today}
            tabIndex={key === visibleFocus ? 0 : -1}
            aria-label={fullDate(key)}
            aria-pressed={key >= start && key <= (end ?? start)}
            aria-current={key === today ? 'date' : undefined}
            onClick={() => choose(key)}
            onKeyDown={(event) => keyDown(event, key)}
          >
            {date.getDate()}
          </button>
        ))}
      </div>
      <p className="calendar-hint" role="status">
        {end
          ? 'Range selected. Apply to view your activity.'
          : 'Now choose an end date. Select the same day for a single date.'}
      </p>
      <div className="confirmation-actions">
        <button className="button secondary" onClick={onClose}>
          Cancel
        </button>
        <button
          className="button primary"
          disabled={!selected || !validRange(selected, now)}
          onClick={() => {
            if (selected && validRange(selected, now)) onApply(selected)
          }}
        >
          Apply dates
        </button>
      </div>
    </Modal>
  )
}
