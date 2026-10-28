import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Check, X } from 'lucide-react'
import type { ToastMessage } from '../hooks/useToasts'

function ToastCard({
  message,
  onDismiss,
  covered,
}: {
  message: ToastMessage
  onDismiss: (id: string) => void
  covered: boolean
}) {
  const [closing, setClosing] = useState(false)
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setClosing(true),
      Math.max(0, 3000 - (Date.now() - message.createdAt)),
    )
    return () => window.clearTimeout(timeout)
  }, [message.createdAt])
  useEffect(() => {
    if (!closing) return
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const timeout = window.setTimeout(
      () => dismissRef.current(message.id),
      reduced ? 0 : 280,
    )
    return () => window.clearTimeout(timeout)
  }, [closing, message.id])
  return (
    <div
      className="toast"
      data-open={!closing}
      aria-hidden={closing || covered}
      inert={closing || covered}
    >
      <span className="toast-check">
        <Check size={16} />
      </span>
      <span>{message.text}</span>
      <button
        className="icon-button"
        aria-label="Dismiss message"
        onClick={() => setClosing(true)}
        disabled={closing || covered}
      >
        <X size={16} />
      </button>
    </div>
  )
}

export function Toast({
  messages,
  onDismiss,
}: {
  messages: ToastMessage[]
  onDismiss: (id: string) => void
}) {
  const stack = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [height, setHeight] = useState(64)
  const newestFirst = [...messages].reverse()
  useLayoutEffect(() => {
    const cards = stack.current?.querySelectorAll<HTMLElement>('.toast')
    if (!cards?.length) return
    const measure = () =>
      setHeight(Math.max(...Array.from(cards, (card) => card.offsetHeight)))
    measure()
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(measure)
    cards.forEach((card) => observer.observe(card))
    return () => observer.disconnect()
  }, [messages])
  return (
    <div className="toast-region">
      <span
        className="sr-only"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {newestFirst[0]?.text ?? ''}
      </span>
      <div
        ref={stack}
        className="toast-stack"
        data-expanded={expanded}
        data-populated={messages.length > 0}
        style={
          {
            '--toast-height': `${height}px`,
            '--toast-count': messages.length,
          } as CSSProperties
        }
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => {
          if (!stack.current?.contains(document.activeElement))
            setExpanded(false)
        }}
        onFocusCapture={() => setExpanded(true)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget))
            setExpanded(false)
        }}
      >
        {newestFirst.map((message, index) => (
          <div
            key={message.id}
            className="toast-slot"
            style={
              {
                '--toast-index': index,
                zIndex: newestFirst.length - index,
              } as CSSProperties
            }
          >
            <ToastCard
              message={message}
              onDismiss={onDismiss}
              covered={!expanded && index > 0}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
