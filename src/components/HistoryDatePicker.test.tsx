import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RangeCalendar } from './HistoryDatePicker'
import { History } from './History'
import { freshData } from '../services/engine'

const now = new Date(2026, 9, 28, 13).getTime()
beforeEach(() => {
  vi.stubGlobal('scrollTo', vi.fn())
  HTMLDialogElement.prototype.showModal = function () {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close = function () {
    this.removeAttribute('open')
  }
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('selects both ends in one calendar and applies an inclusive range', async () => {
  const user = userEvent.setup()
  const apply = vi.fn()
  const view = render(
    <RangeCalendar
      initial={{ start: '2026-10-28', end: '2026-10-28' }}
      now={now}
      onClose={vi.fn()}
      onApply={apply}
    />,
  )
  await user.click(view.container.querySelector('[data-day="2026-10-05"]')!)
  expect(
    (screen.getByRole('button', { name: 'Apply dates' }) as HTMLButtonElement)
      .disabled,
  ).toBe(true)
  await user.click(view.container.querySelector('[data-day="2026-10-20"]')!)
  await user.click(screen.getByRole('button', { name: 'Apply dates' }))
  expect(apply).toHaveBeenCalledWith({ start: '2026-10-05', end: '2026-10-20' })
  expect(
    (
      view.container.querySelector(
        '[data-day="2026-10-29"]',
      ) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
})

it('selects a range backwards across two months', async () => {
  const user = userEvent.setup()
  const apply = vi.fn()
  const view = render(
    <RangeCalendar
      initial={{ start: '2026-10-28', end: '2026-10-28' }}
      now={now}
      onClose={vi.fn()}
      onApply={apply}
    />,
  )
  await user.click(view.container.querySelector('[data-day="2026-10-05"]')!)
  await user.click(screen.getByRole('button', { name: 'Previous month' }))
  await user.click(view.container.querySelector('[data-day="2026-09-28"]')!)
  await user.click(screen.getByRole('button', { name: 'Apply dates' }))
  expect(apply).toHaveBeenCalledWith({ start: '2026-09-28', end: '2026-10-05' })
})

it('supports choosing the range with arrow keys and Enter', async () => {
  const user = userEvent.setup()
  const apply = vi.fn()
  const view = render(
    <RangeCalendar
      initial={{ start: '2026-10-28', end: '2026-10-28' }}
      now={now}
      onClose={vi.fn()}
      onApply={apply}
    />,
  )
  await user.click(view.container.querySelector('[data-day="2026-10-05"]')!)
  await user.keyboard('{ArrowRight}{Enter}')
  await user.click(screen.getByRole('button', { name: 'Apply dates' }))
  expect(apply).toHaveBeenCalledWith({ start: '2026-10-05', end: '2026-10-06' })
})

it('filters activity and totals to the complete selected period', () => {
  const data = freshData()
  data.water = [
    { id: 'a', timestamp: new Date(2026, 9, 5, 10).getTime(), amountMl: 150 },
    {
      id: 'b',
      timestamp: new Date(2026, 9, 6, 23, 59).getTime(),
      amountMl: 250,
    },
    { id: 'c', timestamp: new Date(2026, 9, 7).getTime(), amountMl: 500 },
  ]
  data.breaks = [
    {
      id: 'break',
      timestamp: new Date(2026, 9, 6, 12).getTime(),
      durationMs: 300000,
      status: 'completed',
    },
  ]
  render(
    <History
      range={{ start: '2026-10-05', end: '2026-10-06' }}
      data={data}
      now={now}
      disabled={false}
      dispatch={vi.fn()}
      invalidateUndo={vi.fn()}
      notify={vi.fn()}
    />,
  )
  expect(
    screen.getByLabelText('Water logged in selected period').textContent,
  ).toContain('400ml')
  expect(
    screen.getByLabelText('Completed breaks in selected period').textContent,
  ).toContain('1completed')
  expect(screen.getByText('150 ml of water')).toBeTruthy()
  expect(screen.getByText('250 ml of water')).toBeTruthy()
  expect(screen.queryByText('500 ml of water')).toBeNull()
})
