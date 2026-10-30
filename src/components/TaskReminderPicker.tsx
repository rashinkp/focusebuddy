import { useState } from 'react'
import { CalendarDays, Clock3 } from 'lucide-react'
import { Modal } from './Modal'
import { dayKey } from '../utils/time'
import { reminderTimestamp, taskReminderLabel } from '../utils/taskDates'

export function TaskReminderPicker({
  value,
  now,
  onSet,
  onClose,
}: {
  value: number | null
  now: number
  onSet: (at: number) => void
  onClose: () => void
}) {
  const [date, setDate] = useState(
    dayKey(value ?? Math.ceil((now + 3_600_000) / 300_000) * 300_000),
  )
  const [time, setTime] = useState(() => {
    const next = new Date(
      value ?? Math.ceil((now + 3_600_000) / 300_000) * 300_000,
    )
    return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`
  })
  const [custom, setCustom] = useState(
    value !== null && dayKey(value) !== dayKey(now),
  )
  const [hour, minute] = time.split(':').map(Number)
  const period = hour >= 12 ? 'PM' : 'AM'
  const setClock = (
    displayHour: number,
    displayMinute: number,
    meridiem: string,
  ) => {
    const hours = (displayHour % 12) + (meridiem === 'PM' ? 12 : 0)
    setTime(
      `${String(hours).padStart(2, '0')}:${String(displayMinute).padStart(2, '0')}`,
    )
  }
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const timestamp = reminderTimestamp(date, time)
  const valid = timestamp !== null && timestamp > now
  return (
    <Modal title="Remind me" onClose={onClose}>
      <form
        className="task-reminder-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (valid) onSet(timestamp)
        }}
      >
        <div className="task-date-presets" aria-label="Reminder day">
          <button
            type="button"
            aria-pressed={!custom && date === dayKey(now)}
            onClick={() => {
              setCustom(false)
              setDate(dayKey(now))
            }}
          >
            Later today
          </button>
          <button
            type="button"
            aria-pressed={!custom && date === dayKey(tomorrow.getTime())}
            onClick={() => {
              setCustom(false)
              setDate(dayKey(tomorrow.getTime()))
            }}
          >
            Tomorrow
          </button>
          <button
            type="button"
            aria-pressed={custom}
            onClick={() => setCustom(true)}
          >
            Custom
          </button>
        </div>
        <div className="task-date-fields">
          {custom && (
            <label>
              <span>
                <CalendarDays size={15} />
                Date
              </span>
              <input
                type="date"
                aria-label="Reminder date"
                min={dayKey(now)}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                onInput={(e) => setDate(e.currentTarget.value)}
                required
              />
            </label>
          )}
          <div className="task-time-field">
            <span>
              <Clock3 size={15} />
              Time
            </span>
            <div
              className="task-time-controls"
              role="group"
              aria-label="Reminder time"
            >
              <select
                aria-label="Reminder hour"
                value={hour % 12 || 12}
                onChange={(e) =>
                  setClock(Number(e.target.value), minute, period)
                }
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <option key={i + 1} value={i + 1}>
                    {i + 1}
                  </option>
                ))}
              </select>
              <span aria-hidden="true">:</span>
              <select
                aria-label="Reminder minute"
                value={minute}
                onChange={(e) =>
                  setClock(hour % 12 || 12, Number(e.target.value), period)
                }
              >
                {Array.from({ length: 60 }, (_, i) => (
                  <option key={i} value={i}>
                    {String(i).padStart(2, '0')}
                  </option>
                ))}
              </select>
              <select
                aria-label="AM or PM"
                value={period}
                onChange={(e) =>
                  setClock(hour % 12 || 12, minute, e.target.value)
                }
              >
                <option>AM</option>
                <option>PM</option>
              </select>
            </div>
          </div>
        </div>
        <p className="task-picker-hint">
          {valid
            ? taskReminderLabel(timestamp, now)
            : 'Choose a future date and time.'}
          <span>Uses your device’s local time.</span>
        </p>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="button primary" disabled={!valid}>
            Set reminder
          </button>
        </div>
      </form>
    </Modal>
  )
}
