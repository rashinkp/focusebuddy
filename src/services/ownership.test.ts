import { afterEach, describe, expect, it, vi } from 'vitest'
import { claimOwnership } from './ownership'

afterEach(() => vi.restoreAllMocks())
describe('writable-tab ownership', () => {
  it('holds ownership until cleanup and aborts pending requests', async () => {
    let signal: AbortSignal | undefined
    let pending: Promise<void> | undefined
    const acquired = vi.fn()
    const unavailable = vi.fn()
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: vi.fn((_name, options, callback) => {
        signal = options.signal
        pending = callback()
        return pending
      }) },
    })
    const release = claimOwnership(acquired, unavailable)
    expect(acquired).toHaveBeenCalledTimes(1)
    expect(signal?.aborted).toBe(false)
    release()
    await pending
    expect(signal?.aborted).toBe(true)
    expect(unavailable).not.toHaveBeenCalled()
  })
  it('does not grant a cancelled tab ownership', async () => {
    let callback: (() => Promise<void>) | undefined
    const acquired = vi.fn()
    Object.defineProperty(navigator, 'locks', {
      configurable: true,
      value: { request: vi.fn((_name, _options, cb) => {
        callback = cb
        return Promise.resolve()
      }) },
    })
    const release = claimOwnership(acquired, vi.fn())
    release()
    await callback?.()
    expect(acquired).not.toHaveBeenCalled()
  })
  it('requires a user-confirmed single-tab fallback when locks are unavailable', () => {
    Object.defineProperty(navigator, 'locks', { configurable: true, value: undefined })
    const acquired = vi.fn()
    const unavailable = vi.fn()
    claimOwnership(acquired, unavailable)()
    expect(acquired).not.toHaveBeenCalled()
    expect(unavailable).toHaveBeenCalledOnce()
  })
})
