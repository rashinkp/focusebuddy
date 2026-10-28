import { useCallback, useEffect, useState } from 'react'

type Tab = 'today' | 'history'
const readTab = (): Tab =>
  new URL(window.location.href).searchParams.get('tab') === 'history'
    ? 'history'
    : 'today'

export function useTabNavigation() {
  const [tab, setTab] = useState<Tab>(readTab)

  useEffect(() => {
    const restoreTab = () => setTab(readTab())
    window.addEventListener('popstate', restoreTab)
    return () => window.removeEventListener('popstate', restoreTab)
  }, [])

  const navigate = useCallback((next: Tab) => {
    if (next === readTab()) return
    const url = new URL(window.location.href)
    url.searchParams.set('tab', next)
    window.history.pushState(window.history.state, '', url)
    setTab(next)
  }, [])

  return [tab, navigate] as const
}
