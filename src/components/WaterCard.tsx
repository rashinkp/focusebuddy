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
}: {
  data: AppData
  now: number
  disabled: boolean
  addWater: (amount: number) => void
  undo: boolean
  undoWater: () => void
}) {
  const [custom, setCustom] = useState('')
  const canAdd = !disabled && validAmount(Number(custom))
  const total = data.water
    .filter((e) => inDay(e.timestamp, now))
    .reduce((n, e) => n + e.amountMl, 0)
  const percent = Math.round((total / data.settings.dailyWaterGoalMl) * 100)
  const submit = (event: FormEvent) => {
    event.preventDefault()
    const amount = Number(custom)
    if (!canAdd) return
    addWater(amount)
    setCustom('')
  }
  return (
    <section className="card water-card" aria-labelledby="water-heading">
      <div className="card-heading">
        <h2 id="water-heading">
          <Droplets size={17} />
          Water
        </h2>
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
        <span>{percent}% of daily goal</span>
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
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            title="Enter a whole number from 1 to 2,000 ml"
            placeholder="Custom amount"
            value={custom}
            disabled={disabled}
            onChange={(e) => {
              const value = e.target.value
              if (
                value === '' ||
                (/^[1-9][0-9]{0,3}$/.test(value) && validAmount(Number(value)))
              ) {
                setCustom(value)
              }
            }}
            aria-describedby="water-amount-hint"
          />
          <span>ml</span>
        </div>
        <button
          type="submit"
          className="icon-button custom-add"
          aria-label="Add custom water amount"
          disabled={!canAdd}
        >
          <Plus size={20} />
        </button>
      </form>
      <span id="water-amount-hint" className="sr-only">
        Enter a whole number from 1 to 2,000 ml.
      </span>
    </section>
  )
}
