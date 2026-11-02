import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from 'react'
import { Bell, Check, X } from 'lucide-react'
import type { ToastMessage } from '../hooks/useToasts'
import type { Task } from '../types'
import type { Action } from '../services/engine'

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
  const shownAt = useRef(Date.now())
  const dismissRef = useRef(onDismiss)
  const actionRef = useRef<(() => void) | null>(null)
  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])
  useEffect(() => {
    const timeout = window.setTimeout(
      () => setClosing(true),
      Math.max(0, (message.durationMs ?? 3000) - (Date.now() - (message.actions ? shownAt.current : message.createdAt))),
    )
    return () => window.clearTimeout(timeout)
  }, [message.createdAt, message.durationMs, message.actions !== undefined])
  useEffect(() => {
    if (!closing) return
    const reduced = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches
    const timeout = window.setTimeout(
      () => {
        if (actionRef.current) actionRef.current()
        else dismissRef.current(message.id)
      },
      reduced ? 0 : 280,
    )
    return () => window.clearTimeout(timeout)
  }, [closing, message.id])
  return (
    <div
      className={`toast ${message.actions ? 'toast-reminder' : ''}`}
      data-open={!closing}
      aria-hidden={closing || covered}
      inert={closing || covered}
    >
      <span className="toast-check">
        {message.actions ? <Bell size={16} /> : <Check size={16} />}
      </span>
      <span>{message.text}</span>
      {message.actions ? (
        <div className="toast-actions">
          {message.actions.map((action) => (
            <button
              key={action.label}
              className={`button ${action.label === 'Complete' ? 'primary' : 'secondary'}`}
              disabled={action.disabled || closing || covered}
              onClick={() => {
                actionRef.current = action.onClick
                setClosing(true)
              }}
            >
              {action.label === 'Complete' && <Check size={14} />}
              {action.label}
            </button>
          ))}
        </div>
      ) : (
        <button
          className="icon-button"
          aria-label="Dismiss message"
          onClick={() => setClosing(true)}
          disabled={closing || covered}
        >
          <X size={16} />
        </button>
      )}
    </div>
  )
}

export function Toast({
  messages,
  onDismiss,
  tasks = [],
  onTaskAction,
  disabled = false,
}: {
  tasks?: Task[]
  onTaskAction?: (action: Action) => void
  disabled?: boolean
  messages: ToastMessage[]
  onDismiss: (id: string) => void
}) {
  const stack = useRef<HTMLDivElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [hiddenReminders, setHiddenReminders] = useState<string[]>([])
  const [height, setHeight] = useState(64)
  const reminders: ToastMessage[] = tasks
    .filter((task) => task.completedAt === null && task.reminderStatus === 'due')
    .map((task) => ({
      id: `task:${task.id}:${task.reminderAt}`,
      text: task.title,
      createdAt: task.reminderAt ?? task.createdAt,
      durationMs: 10_000,
      actions: [
        { label: 'Dismiss', disabled: disabled || !onTaskAction, onClick: () => onTaskAction?.({ type: 'task-dismiss', id: task.id }) },
        { label: 'Complete', disabled: disabled || !onTaskAction, onClick: () => onTaskAction?.({ type: 'task-toggle', id: task.id }) },
      ],
    }))
  const allMessages = [...messages, ...reminders.filter((message) => !hiddenReminders.includes(message.id))]
  const newestFirst = allMessages.sort((a, b) => b.createdAt - a.createdAt)
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
  }, [messages, tasks, hiddenReminders])
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
        data-reminders={allMessages.some((message) => !!message.actions)}
        data-populated={allMessages.length > 0}
        style={
          {
            '--toast-height': `${height}px`,
            '--toast-count': allMessages.length,
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
              onDismiss={(id) => {
                if (message.actions) setHiddenReminders((current) => [...current, id])
                else onDismiss(id)
              }}
              covered={!expanded && index > 0}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
