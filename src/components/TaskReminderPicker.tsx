import { useState } from 'react'
import { AnchoredPopover } from './AnchoredPopover'
import { ReminderTimeList } from './ReminderTimeList'
import { DateCalendar } from './DateCalendar'
import { dayKey } from '../utils/time'
import { reminderTimestamp } from '../utils/taskDates'

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
  const [time] = useState(() => {
    const next = new Date(
      value ?? Math.ceil((now + 3_600_000) / 300_000) * 300_000,
    )
    return `${String(next.getHours()).padStart(2, '0')}:${String(next.getMinutes()).padStart(2, '0')}`
  })
  return (
    <AnchoredPopover title="Remind me" onClose={onClose} compact>
      <div className="reminder-split-picker">
        <DateCalendar
          value={date}
          today={dayKey(now)}
          min={dayKey(now)}
          onChange={setDate}
        />
        <div className="reminder-time-column">
          <ReminderTimeList
            date={date}
            value={time}
            now={now}
            onChange={(selectedTime) => {
              const timestamp = reminderTimestamp(date, selectedTime)
              if (timestamp !== null && timestamp > now) onSet(timestamp)
            }}
          />
        </div>
      </div>
    </AnchoredPopover>
  )
}
