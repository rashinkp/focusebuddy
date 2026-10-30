import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { AnchoredPopover } from './AnchoredPopover'

afterEach(cleanup)
function Example() {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button onClick={() => setOpen(!open)}>Reminder</button>
      <input aria-label="Outside" />
      {open && (
        <AnchoredPopover title="Remind me" onClose={() => setOpen(false)}>
          <button>Choose date</button>
        </AnchoredPopover>
      )}
    </>
  )
}
it('opens without locking the page and restores focus with Escape', async () => {
  const user = userEvent.setup()
  render(<Example />)
  const before = document.body.style.position
  const trigger = screen.getByRole('button', { name: 'Reminder' })
  await user.click(trigger)
  expect(
    screen
      .getByRole('dialog', { name: 'Remind me' })
      .getAttribute('aria-modal'),
  ).toBe('false')
  expect(document.body.style.position).toBe(before)
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})
it('dismisses on an outside click and lets focus move to that control', async () => {
  const user = userEvent.setup()
  render(<Example />)
  await user.click(screen.getByRole('button', { name: 'Reminder' }))
  await user.click(screen.getByRole('textbox', { name: 'Outside' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(
    screen.getByRole('textbox', { name: 'Outside' }),
  )
})
it('stays in the parent dialog focus scope without closing its parent on Escape', async () => {
  const user = userEvent.setup()
  render(
    <dialog open aria-label="Edit task">
      <Example />
    </dialog>,
  )
  await user.click(screen.getByRole('button', { name: 'Reminder' }))
  expect(
    screen.getByRole('dialog', { name: 'Remind me' }).parentElement?.tagName,
  ).toBe('DIALOG')
  await user.keyboard('{Escape}')
  expect(screen.getByRole('dialog', { name: 'Edit task' })).toBeTruthy()
  expect(screen.queryByRole('dialog', { name: 'Remind me' })).toBeNull()
})
