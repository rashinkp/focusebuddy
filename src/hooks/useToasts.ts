import { useCallback, useState } from 'react'

export interface ToastMessage {
  id: string
  text: string
  durationMs?: number
  actions?: { label: string; onClick: () => void; disabled?: boolean }[]
  createdAt: number
}

export function useToasts() {
  const [messages, setMessages] = useState<ToastMessage[]>([])
  const notify = useCallback((text: string) => {
    if (!text) return
    const message = { id: crypto.randomUUID(), text, createdAt: Date.now() }
    setMessages((current) => [...current.slice(-2), message])
  }, [])
  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id))
  }, [])
  return { messages, notify, dismiss }
}
