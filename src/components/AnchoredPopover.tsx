import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

export function AnchoredPopover({
  title,
  children,
  onClose,
  compact = false,
}: {
  title: string
  children: ReactNode
  onClose: () => void
  compact?: boolean
}) {
  const panel = useRef<HTMLDivElement>(null)
  const close = useRef(onClose)
  close.current = onClose
  const [anchor] = useState(() =>
    document.activeElement instanceof HTMLElement &&
    document.activeElement !== document.body
      ? document.activeElement
      : null,
  )
  const [position, setPosition] = useState({
    top: 8,
    left: 8,
    maxHeight: window.innerHeight - 16,
  })
  useLayoutEffect(() => {
    const place = () => {
      if (!panel.current) return
      const box = panel.current.getBoundingClientRect()
      const rect = anchor?.getBoundingClientRect()
      const width = document.documentElement.clientWidth
      const height = window.innerHeight
      if (!rect || !anchor?.isConnected) {
        setPosition({
          top: Math.max(8, (height - box.height) / 2),
          left: Math.max(8, (width - box.width) / 2),
          maxHeight: height - 16,
        })
        return
      }
      if (rect.bottom < 0 || rect.top > height) {
        close.current()
        return
      }
      const below = height - rect.bottom - 16
      const above = rect.top - 16
      const upwards = below < box.height && above > below
      const maxHeight = Math.max(120, upwards ? above : below)
      const panelHeight = Math.min(panel.current.scrollHeight + 2, maxHeight)
      setPosition({
        top: Math.max(
          8,
          Math.min(
            upwards ? rect.top - panelHeight - 8 : rect.bottom + 8,
            height - panelHeight - 8,
          ),
        ),
        left: Math.max(
          8,
          Math.min(rect.right - box.width, width - box.width - 8),
        ),
        maxHeight,
      })
    }
    place()
    const focus =
      panel.current?.querySelector<HTMLElement>(
        '[aria-pressed="true"]:not(:disabled)',
      ) ??
      panel.current?.querySelector<HTMLElement>(
        'button:not(:disabled),[tabindex="0"]',
      )
    focus?.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    const element = panel.current
    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(place) : null
    if (element) observer?.observe(element)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
      observer?.disconnect()
      if (
        anchor?.isConnected &&
        (element?.contains(document.activeElement) ||
          document.activeElement === document.body)
      )
        anchor.focus({ preventScroll: true })
    }
  }, [anchor])
  useEffect(() => {
    const outside = (event: Event) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !anchor?.contains(event.target as Node)
      )
        close.current()
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        close.current()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', escape, true)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', escape, true)
    }
  }, [anchor])
  return createPortal(
    <div
      ref={panel}
      className={`anchored-popover ${compact ? 'is-compact' : ''}`}
      role="dialog"
      aria-label={title}
      aria-modal="false"
      style={position}
    >
      {!compact && (
        <div className="popover-heading">
          <h2>{title}</h2>
          <button
            type="button"
            className="icon-button"
            aria-label={`Close ${title}`}
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </div>
      )}
      {children}
    </div>,
    anchor?.closest('dialog') ?? document.body,
  )
}
