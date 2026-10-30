import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { Dropdown } from './Dropdown'
import { DateCalendar } from './DateCalendar'

afterEach(cleanup)
const options = [
  { value: 'a', label: 'AM' },
  { value: 'p', label: 'PM' },
]
function Example() {
  const [value, setValue] = useState('a')
  return (
    <>
      <Dropdown
        label="Period"
        value={value}
        options={options}
        onChange={setValue}
      />
      <button>Outside</button>
    </>
  )
}
it('chooses with arrows and Enter, and Escape closes without changing selection', async () => {
  const user = userEvent.setup()
  render(<Example />)
  const trigger = screen.getByRole('combobox', { name: 'Period' })
  await user.click(trigger)
  expect(
    screen.getByRole('option', { name: 'AM' }).getAttribute('aria-selected'),
  ).toBe('true')
  await user.keyboard('{ArrowDown}{Enter}')
  expect(trigger.textContent).toBe('PM')
  expect(document.activeElement).toBe(trigger)
  await user.keyboard('{ArrowDown}{Home}{Escape}')
  expect(trigger.textContent).toBe('PM')
  expect(screen.queryByRole('listbox')).toBeNull()
})
it('supports typeahead, outside clicks, and disabled selectors', async () => {
  const user = userEvent.setup()
  const view = render(<Example />)
  await user.click(screen.getByRole('combobox'))
  await user.keyboard('p{Enter}')
  expect(screen.getByRole('combobox').textContent).toBe('PM')
  await user.click(screen.getByRole('combobox'))
  await user.click(screen.getByRole('button', { name: 'Outside' }))
  expect(screen.queryByRole('listbox')).toBeNull()
  view.rerender(
    <Dropdown
      label="Period"
      value="a"
      options={options}
      onChange={vi.fn()}
      disabled
    />,
  )
  await user.click(screen.getByRole('combobox'))
  expect(screen.queryByRole('listbox')).toBeNull()
})
it('keeps the menu in a dialog focus scope', async () => {
  const user = userEvent.setup()
  render(
    <dialog open>
      <Example />
    </dialog>,
  )
  await user.click(screen.getByRole('combobox'))
  expect(screen.getByRole('listbox').closest('dialog')).toBeTruthy()
})
it('selects a reminder date across months and blocks past dates', async () => {
  const user = userEvent.setup()
  const change = vi.fn()
  render(
    <DateCalendar
      value="2026-10-30"
      min="2026-10-30"
      today="2026-10-30"
      onChange={change}
    />,
  )
  expect(
    (
      screen.getByRole('button', {
        name: 'Thursday, October 29, 2026',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
  expect(
    (
      screen.getByRole('button', {
        name: 'Previous month',
      }) as HTMLButtonElement
    ).disabled,
  ).toBe(true)
  await user.click(screen.getByRole('button', { name: 'Next month' }))
  await user.click(
    screen.getByRole('button', { name: 'Monday, November 2, 2026' }),
  )
  expect(change).toHaveBeenCalledWith('2026-11-02')
})
it('navigates the calendar by keyboard without skipping the month boundary', async () => {
  const user = userEvent.setup()
  const change = vi.fn()
  render(
    <DateCalendar
      value="2026-10-30"
      min="2026-10-30"
      today="2026-10-30"
      onChange={change}
    />,
  )
  screen.getByRole('button', { name: 'Friday, October 30, 2026' }).focus()
  await user.keyboard('{ArrowRight}{ArrowRight}{Enter}')
  expect(change).toHaveBeenCalledWith('2026-11-01')
})
