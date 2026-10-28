import { useState, type FormEvent } from 'react'
import { Droplets, Plus, Undo2 } from 'lucide-react'
import type { AppData } from '../types'
import { inDay } from '../utils/time'
import { validAmount } from '../services/engine'

export function WaterCard({
  data,
  now,
  disabled,
  addWater,
  undo,
  undoWater,
  openHistory,
}: {
  data: AppData
  now: number
  disabled: boolean
  addWater: (amount: number) => void
  undo: boolean
  undoWater: () => void
  openHistory: () => void
}) {
  const [custom, setCustom] = useState('')
  const [error, setError] = useState('')
  const total = data.water
    .filter((e) => inDay(e.timestamp, now))
    .reduce((n, e) => n + e.amountMl, 0)
  const percent = Math.round((total / data.settings.dailyWaterGoalMl) * 100)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(custom)
    if (!validAmount(amount)) {
      setError('Enter a whole number from 1 to 2,000 ml.')
      return
    }
    addWater(amount)
    setCustom('')
    setError('')
  }
  return (
    <section className="card water-card" aria-labelledby="water-heading">
      <div className="card-heading">
        <span className="section-label">
          <Droplets size={17} /> STAY HYDRATED
        </span>
        <button
          className="icon-button"
          disabled={!undo || disabled}
          aria-label="Undo last water addition"
          title="Undo last water addition"
          onClick={undoWater}
        >
          <Undo2 size={17} />
        </button>
      </div>
      <div className="water-top">
        <div>
          <h2 id="water-heading">A sip at a time.</h2>
          <p className="muted">Keep water within reach.</p>
        </div>
        <div className="water-symbol" aria-hidden="true">
          <Droplets size={31} strokeWidth={1.3} />
        </div>
      </div>
      <div className="water-amount">
        <strong>{total.toLocaleString()}</strong>
        <span> / {data.settings.dailyWaterGoalMl.toLocaleString()} ml</span>
      </div>
      <div
        className="water-progress"
        role="progressbar"
        aria-label="Daily water goal"
        aria-valuenow={Math.min(total, data.settings.dailyWaterGoalMl)}
        aria-valuemin={0}
        aria-valuemax={data.settings.dailyWaterGoalMl}
        aria-valuetext={`${total} milliliters, ${percent} percent of your personal goal`}
      >
        <span style={{ width: `${Math.min(100, percent)}%` }} />
      </div>
      <div className="progress-caption">
        <span>{percent}% of your personal goal</span>
        <span>{(total / 1000).toFixed(2)} L today</span>
      </div>
      <div className="quick-add">
        {[150, 250, 500].map((amount) => (
          <button
            key={amount}
            className="button water-button"
            disabled={disabled}
            onClick={() => addWater(amount)}
          >
            <Plus size={14} />
            {amount} ml
          </button>
        ))}
      </div>
      <form onSubmit={submit} className="custom-water" noValidate>
        <label className="sr-only" htmlFor="water-amount">
          Custom water amount in ml
        </label>
        <div className="input-unit">
          <input
            id="water-amount"
            type="number"
            min="1"
            max="2000"
            step="1"
            inputMode="numeric"
            placeholder="Custom amount"
            value={custom}
            disabled={disabled}
            onChange={(e) => {
              setCustom(e.target.value)
              setError('')
            }}
            aria-describedby={error ? 'water-error' : undefined}
            aria-invalid={!!error}
          />
          <span>ml</span>
        </div>
        <button
          type="submit"
          className="icon-button custom-add"
          aria-label="Add custom water amount"
          disabled={disabled}
        >
          <Plus size={20} />
        </button>
      </form>
      {error && (
        <p id="water-error" className="field-error" role="alert">
          {error}
        </p>
      )}
      <button className="text-button water-history" onClick={openHistory}>
        View water history <span aria-hidden="true">↗</span>
      </button>
    </section>
  )
}
