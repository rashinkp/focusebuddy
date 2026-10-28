import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import App from './App'
import { freshData, transition } from './services/engine'
import { load, save, STORAGE_KEY } from './services/storage'

beforeEach(() => {
  window.history.replaceState(null, '', '/')
  localStorage.clear()
  Object.defineProperty(navigator, 'locks', {
    configurable: true,
    value: { request: vi.fn((_name, _options, callback) => callback()) },
  })
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
  vi.useRealTimers()
})
async function mount() {
  const view = render(<App />)
  await waitFor(() =>
    expect(
      (
        screen.getByRole('button', {
          name: 'Start work session',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false),
  )
  return view
}

describe('application interactions', () => {
  it('updates the URL without adding duplicate tab history entries', async () => {
    const user = userEvent.setup()
    await mount()
    const length = window.history.length
    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(window.location.search).toBe('?tab=history')
    expect(window.history.length).toBe(length + 1)
    await user.click(screen.getByRole('button', { name: 'History' }))
    expect(window.history.length).toBe(length + 1)
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(window.location.search).toBe('?tab=today')
  })

  it('restores the tab from its URL on reload', () => {
    window.history.replaceState(null, '', '/?tab=history')
    const view = render(<App />)
    expect(screen.getByRole('heading', { name: 'History' })).toBeTruthy()
    view.unmount()
    render(<App />)
    expect(screen.getByRole('heading', { name: 'History' })).toBeTruthy()
  })

  it('restores previous and next tabs with browser Back and Forward', async () => {
    const user = userEvent.setup()
    await mount()
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(screen.getByRole('button', { name: 'Today' }))
    act(() => window.history.back())
    await waitFor(() => expect(screen.getByRole('button', { name: 'History' }).getAttribute('aria-current')).toBe('page'))
    expect(window.location.search).toBe('?tab=history')
    act(() => window.history.back())
    await waitFor(() => expect(screen.getByRole('button', { name: 'Today' }).getAttribute('aria-current')).toBe('page'))
    expect(window.location.search).toBe('')
    act(() => window.history.forward())
    await waitFor(() => expect(screen.getByRole('button', { name: 'History' }).getAttribute('aria-current')).toBe('page'))
  })

  it('adds water, undoes it, and persists valid custom amounts', async () => {
    const user = userEvent.setup()
    await mount()
    await user.click(screen.getByRole('button', { name: '250 ml' }))
    expect(load().data.water[0].amountMl).toBe(250)
    await user.click(
      screen.getByRole('button', { name: 'Undo last water addition' }),
    )
    expect(load().data.water).toHaveLength(0)
    await user.type(screen.getByLabelText('Custom water amount in ml'), '0')
    await user.click(
      screen.getByRole('button', { name: 'Add custom water amount' }),
    )
    expect(
      (
        screen.getByRole('button', {
          name: 'Add custom water amount',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    expect(screen.queryByRole('alert')).toBeNull()
    const customInput = screen.getByLabelText(
      'Custom water amount in ml',
    ) as HTMLInputElement
    await user.click(customInput)
    for (const invalid of ['-10', '1.5', '2e2', 'abcd', '2001', '20000']) {
      await user.paste(invalid)
      expect(customInput.value).toBe('')
    }
    await user.clear(screen.getByLabelText('Custom water amount in ml'))
    await user.type(screen.getByLabelText('Custom water amount in ml'), '350')
    await user.click(
      screen.getByRole('button', { name: 'Add custom water amount' }),
    )
    expect(load().data.water[0].amountMl).toBe(350)
  })
  it('edits and deletes water history and invalidates undo of that entry', async () => {
    const user = userEvent.setup()
    await mount()
    await user.click(screen.getByRole('button', { name: '250 ml' }))
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(
      screen.getByRole('button', { name: 'Edit 250 ml water entry' }),
    )
    const input = screen.getByLabelText('Water amount in ml')
    await user.clear(input)
    await user.type(input, '400')
    await user.click(screen.getByRole('button', { name: 'Save water entry' }))
    expect(load().data.water[0].amountMl).toBe(400)
    await user.click(screen.getByRole('button', { name: 'Today' }))
    expect(
      (
        screen.getByRole('button', {
          name: 'Undo last water addition',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true)
    await user.click(screen.getByRole('button', { name: 'History' }))
    await user.click(
      screen.getByRole('button', { name: 'Delete 400 ml water entry' }),
    )
    expect(load().data.water).toHaveLength(0)
  })
  it('starts, pauses, resumes, and ends a real session', async () => {
    const user = userEvent.setup()
    await mount()
    await user.click(screen.getByRole('button', { name: 'Start work session' }))
    expect(load().data.active?.phase).toBe('working')
    await user.click(screen.getByRole('button', { name: 'Pause session' }))
    expect(load().data.active?.phase).toBe('paused')
    await user.click(screen.getByRole('button', { name: 'Resume session' }))
    expect(load().data.active?.phase).toBe('working')
    await user.click(screen.getByRole('button', { name: 'End session' }))
    expect(load().data.active).toBeNull()
  })
  it('survives a remount with records and preferences intact', async () => {
    const user = userEvent.setup()
    const view = await mount()
    await user.click(screen.getByRole('button', { name: '500 ml' }))
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    await user.clear(
      screen.getByRole('spinbutton', { name: 'Daily water goal' }),
    )
    await user.type(
      screen.getByRole('spinbutton', { name: 'Daily water goal' }),
      '2500',
    )
    await user.click(screen.getByRole('button', { name: 'Save preferences' }))
    view.unmount()
    await mount()
    expect(load().data.settings.dailyWaterGoalMl).toBe(2500)
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '500',
    )
  })
  it('requires confirmation before reset and preserves preferences', async () => {
    const user = userEvent.setup()
    await mount()
    await user.click(screen.getByRole('button', { name: '250 ml' }))
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    await user.click(
      screen.getByRole('button', { name: 'Reset today’s activity' }),
    )
    expect(load().data.water).toHaveLength(1)
    await user.click(screen.getByRole('button', { name: 'Keep my data' }))
    expect(load().data.water).toHaveLength(1)
    await user.click(
      screen.getByRole('button', { name: 'Reset today’s activity' }),
    )
    await user.click(screen.getByRole('button', { name: 'Reset today' }))
    expect(load().data.water).toHaveLength(0)
    expect(load().data.settings.dailyWaterGoalMl).toBe(2000)
  })
  it('keeps secondary tabs read-only and updates from storage events', async () => {
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: vi.fn(() => new Promise(() => {})) },
    })
    render(<App />)
    expect(
      (screen.getByRole('button', { name: '250 ml' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    const data = transition(
      freshData(),
      { type: 'water-add', amount: 500, id: 'other-tab' },
      Date.now(),
    )
    save(data)
    act(() =>
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY })),
    )
    expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
      '500',
    )
  })
  it('retains in-app reminders when notification permission is denied', async () => {
    const requestPermission = vi.fn().mockResolvedValue('denied')
    vi.stubGlobal(
      'Notification',
      Object.assign(vi.fn(), { permission: 'default', requestPermission }),
    )
    const user = userEvent.setup()
    await mount()
    expect(requestPermission).not.toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    await user.click(
      screen.getByRole('switch', { name: 'Desktop notifications' }),
    )
    await waitFor(() =>
      expect(screen.getByText(/Blocked in browser settings/)).toBeTruthy(),
    )
    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(load().data.settings.notificationsEnabled).toBe(false)
    await user.click(
      screen.getByRole('button', { name: 'Close Make it your own' }),
    )
    await user.click(screen.getByRole('button', { name: 'Start work session' }))
    expect(load().data.active?.phase).toBe('working')
  })
  it('shows a due reminder and sends at most one permitted notification across reloads', async () => {
    const NotificationMock = Object.assign(
      vi.fn(function () {
        return { close: vi.fn() }
      }),
      { permission: 'granted' },
    )
    vi.stubGlobal('Notification', NotificationMock)
    const timestamp = Date.now()
    const data = transition(freshData(), { type: 'start' }, timestamp)
    data.settings.notificationsEnabled = true
    data.active!.deadline = timestamp - 1
    save(data)
    const view = render(<App />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start break' })).toBeTruthy(),
    )
    expect(NotificationMock).toHaveBeenCalledTimes(1)
    view.unmount()
    render(<App />)
    await waitFor(() =>
      expect(screen.getByRole('button', { name: 'Start break' })).toBeTruthy(),
    )
    expect(NotificationMock).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByRole('button', { name: 'Start break' }))
    expect(load().data.active?.phase).toBe('break')
  })
  it('keeps unreadable storage untouched until an explicit clear', async () => {
    localStorage.setItem(STORAGE_KEY, '{invalid')
    const user = userEvent.setup()
    render(<App />)
    await waitFor(() =>
      expect(screen.getByRole('alert').textContent).toContain('left untouched'),
    )
    expect(
      (screen.getByRole('button', { name: '250 ml' }) as HTMLButtonElement)
        .disabled,
    ).toBe(true)
    expect(localStorage.getItem(STORAGE_KEY)).toBe('{invalid')
    await user.click(screen.getByRole('button', { name: 'Open settings' }))
    await user.click(
      screen.getByRole('button', { name: 'Reset unreadable saved data' }),
    )
    await user.click(screen.getByRole('button', { name: 'Clear all data' }))
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()
    expect(
      (screen.getByRole('button', { name: '250 ml' }) as HTMLButtonElement)
        .disabled,
    ).toBe(false)
  })
})
