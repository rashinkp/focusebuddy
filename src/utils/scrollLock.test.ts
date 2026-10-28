import { afterEach, expect, it, vi } from 'vitest'
import { lockPageScroll } from './scrollLock'

afterEach(() => {
  document.body.removeAttribute('style')
  document.documentElement.removeAttribute('style')
  vi.unstubAllGlobals()
})

it('keeps the page locked through nested dialogs and restores styles and scroll only once', () => {
  const scrollTo = vi.fn()
  vi.stubGlobal('scrollTo', scrollTo)
  vi.stubGlobal('scrollX', 0)
  vi.stubGlobal('scrollY', 420)
  document.body.style.position = 'relative'
  document.body.style.paddingRight = '6px'
  document.documentElement.style.overflow = 'auto'
  const closeSettings = lockPageScroll()
  const closeConfirmation = lockPageScroll()
  expect(document.body.style.position).toBe('fixed')
  expect(document.body.style.top).toBe('-420px')
  expect(document.documentElement.style.overflow).toBe('hidden')
  closeConfirmation()
  expect(document.body.style.position).toBe('fixed')
  expect(scrollTo).not.toHaveBeenCalled()
  closeSettings()
  expect(document.body.style.position).toBe('relative')
  expect(document.body.style.paddingRight).toBe('6px')
  expect(document.documentElement.style.overflow).toBe('auto')
  expect(scrollTo).toHaveBeenCalledExactlyOnceWith({
    left: 0,
    top: 420,
    behavior: 'instant',
  })
  closeSettings()
  expect(scrollTo).toHaveBeenCalledOnce()
})
