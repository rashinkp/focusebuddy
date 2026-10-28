import { useState, type FormEvent } from 'react'
import { Check, Coffee, Droplet, Pencil, Trash2, X, Clock3 } from 'lucide-react'
import type { AppData } from '../types'
import type { Action } from '../services/engine'
import { validAmount } from '../services/engine'
import { duration, workDurationBetween } from '../utils/time'
import { rangeBounds, type DateRange } from '../utils/historyDates'

export function History({
  data,
  range,
  now,
  disabled,
  dispatch,
  invalidateUndo,
  notify,
}: {
  data: AppData
  range: DateRange
  now: number
  disabled: boolean
  dispatch: (action: Action) => void
  invalidateUndo: (id?: string) => void
  notify: (message: string) => void
}) {
  const [editing, setEditing] = useState<string | null>(null)
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const [start, end] = rangeBounds(range)
  const inRange = (timestamp: number) => timestamp >= start && timestamp < end
  const water = data.water.filter((e) => inRange(e.timestamp))
  const breaks = data.breaks.filter((e) => inRange(e.timestamp))
  const totalWater = water.reduce((sum, entry) => sum + entry.amountMl, 0)
  const completed = breaks.filter(
    (entry) => entry.status === 'completed',
  ).length
  const skipped = breaks.filter((entry) => entry.status === 'skipped').length
  const worked = workDurationBetween(data, now, start, end)
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
    <>
      <section className="history-metrics" aria-label="Selected period totals">
        <article
          className="card history-metric water-metric"
          aria-label="Water logged in selected period"
        >
          <div className="metric-heading">
            <span className="stat-icon blue">
              <Droplet size={19} strokeWidth={1.5} />
            </span>
            <h2>Water logged</h2>
          </div>
          <strong className="metric-value">
            {totalWater.toLocaleString()}
            <span>ml</span>
          </strong>
          <p>
            {water.length}{' '}
            {water.length === 1 ? 'water check-in' : 'water check-ins'}
          </p>
          <Droplet
            className="metric-decoration"
            size={74}
            strokeWidth={0.8}
            aria-hidden="true"
          />
        </article>
        <article
          className="card history-metric break-metric"
          aria-label="Completed breaks in selected period"
        >
          <div className="metric-heading">
            <span className="stat-icon mint">
              <Coffee size={19} strokeWidth={1.5} />
            </span>
            <h2>Movement breaks</h2>
          </div>
          <strong className="metric-value">
            {completed}
            <span>completed</span>
          </strong>
          <p>
            {skipped} {skipped === 1 ? 'break skipped' : 'breaks skipped'}
          </p>
          <Coffee
            className="metric-decoration"
            size={74}
            strokeWidth={0.8}
            aria-hidden="true"
          />
        </article>
        <article
          className="card history-metric work-metric"
          aria-label="Work time in selected period"
        >
          <div className="metric-heading">
            <span className="stat-icon amber">
              <Clock3 size={19} strokeWidth={1.5} />
            </span>
            <h2>Time worked</h2>
          </div>
          <strong className="metric-value">{duration(worked)}</strong>
          <p>Pauses and breaks excluded</p>
          <Clock3
            className="metric-decoration"
            size={74}
            strokeWidth={0.8}
            aria-hidden="true"
          />
        </article>
      </section>
      <section className="card history-card" aria-labelledby="history-heading">
        <div className="activity-list-heading">
          <h2 id="history-heading">Activity</h2>
          <span>
            {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {!entries.length && (
          <div className="empty-state">
            <div className="empty-icon">
              <Droplet size={22} strokeWidth={1.4} />
            </div>
            <h3>No activity yet.</h3>
            <p>No water entries or break outcomes for these dates.</p>
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
                      {range.start !== range.end && (
                        <>
                          {new Date(entry.timestamp).toLocaleDateString([], {
                            day: 'numeric',
                            month: 'short',
                          })}{' '}
                          ·{' '}
                        </>
                      )}
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
    </>
  )
}
