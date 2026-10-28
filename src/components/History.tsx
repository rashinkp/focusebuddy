import { useState, type FormEvent } from 'react'
import { Check, Coffee, Droplet, Pencil, Trash2, X, Clock3 } from 'lucide-react'
import type { AppData } from '../types'
import type { Action } from '../services/engine'
import { validAmount } from '../services/engine'
import { dayKey, duration, inDay, workDuration } from '../utils/time'

export function History({
  data,
  now,
  disabled,
  dispatch,
  invalidateUndo,
  notify,
}: {
  data: AppData
  now: number
  disabled: boolean
  dispatch: (action: Action) => void
  invalidateUndo: (id?: string) => void
  notify: (message: string) => void
}) {
  const [date, setDate] = useState(dayKey(now))
  const [editing, setEditing] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const selected = new Date(`${date}T12:00:00`).getTime()
  const day = Number.isFinite(selected) ? selected : now
  const water = data.water.filter((e) => inDay(e.timestamp, day))
  const breaks = data.breaks.filter((e) => inDay(e.timestamp, day))
  const entries = [
    ...water.map((e) => ({ ...e, kind: 'water' as const })),
    ...breaks.map((e) => ({ ...e, kind: 'break' as const })),
  ].sort((a, b) => b.timestamp - a.timestamp)
  const saveEdit = (event: FormEvent, id: string) => {
    event.preventDefault()
    if (!validAmount(Number(amount))) {
      setError('Enter 1–2,000 ml, in whole numbers.')
      return
    }
    dispatch({ type: 'water-edit', id, amount: Number(amount) })
    invalidateUndo(id)
    setEditing(null)
    setError('')
    notify('Water entry updated.')
  }
  return (
    <section className="card history-card" aria-labelledby="history-heading">
      <div className="history-heading">
        <h2 id="history-heading" className="sr-only">
          Activity history
        </h2>
        <label className="date-label">
          Date
          <input
            type="date"
            value={date}
            max={dayKey(now)}
            onChange={(e) => {
              setDate(e.target.value)
              setEditing(null)
            }}
          />
        </label>
      </div>
      <div className="history-totals">
        <span>
          <Droplet size={16} />
          {water.reduce((n, e) => n + e.amountMl, 0).toLocaleString()} ml
        </span>
        <span>
          <Coffee size={16} />
          {breaks.filter((e) => e.status === 'completed').length} breaks
          completed
        </span>
        <span>
          <Clock3 size={16} />
          {duration(workDuration(data, now, day))} worked
        </span>
      </div>
      {!entries.length && (
        <div className="empty-state">
          <div className="empty-icon">
            <Droplet size={22} strokeWidth={1.4} />
          </div>
          <h3>No activity yet.</h3>
          <p>Water entries and break outcomes will appear here.</p>
        </div>
      )}
      <ul className="history-list">
        {entries.map((entry) => (
          <li key={entry.id}>
            <div className={`activity-icon ${entry.kind}`}>
              {entry.kind === 'water' ? (
                <Droplet size={17} />
              ) : (
                <Coffee size={17} />
              )}
            </div>
            <div className="activity-main">
              {entry.kind === 'water' && editing === entry.id ? (
                <form
                  className="edit-form"
                  onSubmit={(e) => saveEdit(e, entry.id)}
                  noValidate
                >
                  <label className="sr-only" htmlFor={`edit-${entry.id}`}>
                    Water amount in ml
                  </label>
                  <input
                    autoFocus
                    id={`edit-${entry.id}`}
                    type="number"
                    value={amount}
                    min="1"
                    max="2000"
                    onChange={(e) => setAmount(e.target.value)}
                    aria-invalid={!!error}
                  />
                  <span>ml</span>
                  <button
                    className="icon-button"
                    aria-label="Save water entry"
                    disabled={disabled}
                  >
                    <Check size={17} />
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    aria-label="Cancel editing"
                    onClick={() => {
                      setEditing(null)
                      setError('')
                    }}
                  >
                    <X size={17} />
                  </button>
                  {error && (
                    <span className="field-error" role="alert">
                      {error}
                    </span>
                  )}
                </form>
              ) : (
                <>
                  <strong>
                    {entry.kind === 'water'
                      ? `${entry.amountMl} ml of water`
                      : entry.status === 'completed'
                        ? 'Movement break completed'
                        : entry.status === 'skipped'
                          ? 'Movement break skipped'
                          : 'Movement break interrupted'}
                  </strong>
                  <span>
                    {new Date(entry.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    {entry.kind === 'break' && entry.status !== 'skipped'
                      ? ` · ${duration(entry.durationMs)}`
                      : ''}
                  </span>
                </>
              )}
            </div>
            {entry.kind === 'water' && editing !== entry.id && (
              <div className="entry-actions">
                <button
                  className="icon-button"
                  aria-label={`Edit ${entry.amountMl} ml water entry`}
                  disabled={disabled}
                  onClick={() => {
                    setEditing(entry.id)
                    setAmount(String(entry.amountMl))
                    setError('')
                  }}
                >
                  <Pencil size={15} />
                </button>
                <button
                  className="icon-button danger-icon"
                  aria-label={`Delete ${entry.amountMl} ml water entry`}
                  disabled={disabled}
                  onClick={() => {
                    dispatch({ type: 'water-delete', id: entry.id })
                    invalidateUndo(entry.id)
                    notify('Water entry deleted.')
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}
