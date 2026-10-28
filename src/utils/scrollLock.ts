let locks = 0
let restore: (() => void) | undefined

/** Share one page lock across stacked dialogs, preserving the original scroll position. */
export function lockPageScroll() {
  if (locks === 0) {
    const root = document.documentElement
    const body = document.body
    const x = window.scrollX
    const y = window.scrollY
    const overflow = root.style.overflow
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      width: body.style.width,
      overflow: body.style.overflow,
      paddingRight: body.style.paddingRight,
    }
    const gutter = Math.max(0, window.innerWidth - root.clientWidth)
    const padding =
      Number.parseFloat(window.getComputedStyle(body).paddingRight) || 0
    root.style.overflow = 'hidden'
    Object.assign(body.style, {
      position: 'fixed',
      top: `${-y}px`,
      left: `${-x}px`,
      width: '100%',
      overflow: 'hidden',
      paddingRight: `${padding + gutter}px`,
    })
    restore = () => {
      root.style.overflow = overflow
      Object.assign(body.style, previous)
      window.scrollTo({ left: x, top: y, behavior: 'instant' })
    }
  }
  locks++
  let released = false
  return () => {
    if (released) return
    released = true
    if (--locks === 0) {
      restore?.()
      restore = undefined
    }
  }
}
