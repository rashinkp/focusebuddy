import { useEffect, useRef, useState } from 'react'
import { Check, X } from 'lucide-react'

export function Toast({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  const [lastMessage, setLastMessage] = useState(message)
  const dismissRef = useRef(onDismiss)
  useEffect(() => {
    dismissRef.current = onDismiss
  }, [onDismiss])
  useEffect(() => {
    if (message) setLastMessage(message)
  }, [message])
  useEffect(() => {
    if (!message) return
    const timeout = window.setTimeout(() => dismissRef.current(), 3000)
    return () => window.clearTimeout(timeout)
  }, [message])

  // Keep the surface and its last text mounted until the exit transition finishes.
  return (
    <div
      className="toast-region"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    >
      <div
        className="toast"
        data-open={!!message}
        aria-hidden={!message}
        inert={!message}
      >
        <span className="toast-check">
          <Check size={16} />
        </span>
        <span>{message || lastMessage}</span>
        <button
          className="icon-button"
          aria-label="Dismiss message"
          onClick={onDismiss}
          disabled={!message}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
