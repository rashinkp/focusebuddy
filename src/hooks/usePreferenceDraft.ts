import { useCallback, useEffect, useRef, useState } from 'react'
import type { Settings } from '../types'
import { validSettings, type Action } from '../services/engine'

type NumericPreference = Exclude<keyof Settings, 'notificationsEnabled'>

export function usePreferenceDraft(
  settings: Settings,
  canEdit: boolean,
  dispatch: (action: Action) => void,
) {
  const [draft, setDraft] = useState(settings)
  const draftRef = useRef(draft)
  const saved = useRef(settings)
  const dirty = useRef(new Set<NumericPreference>())
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  useEffect(() => {
    saved.current = settings
  }, [settings])

  const flush = useCallback(() => {
    clearTimeout(timer.current)
    if (!canEdit) return
    let next = { ...saved.current }
    let changed = false
    for (const key of dirty.current) {
      const candidate = { ...next, [key]: draftRef.current[key] }
      if (!validSettings(candidate)) continue
      if (next[key] !== candidate[key]) changed = true
      next = candidate
      dirty.current.delete(key)
    }
    if (changed) {
      saved.current = next
      dispatch({ type: 'settings', settings: next })
    }
  }, [canEdit, dispatch])

  useEffect(() => {
    window.addEventListener('pagehide', flush)
    return () => {
      window.removeEventListener('pagehide', flush)
      clearTimeout(timer.current)
    }
  }, [flush])

  const change = (key: NumericPreference, value: number) => {
    if (!canEdit) return
    const next = { ...draftRef.current, [key]: value }
    draftRef.current = next
    setDraft(next)
    dirty.current.add(key)
    clearTimeout(timer.current)
    timer.current = setTimeout(flush, 400)
  }
  const blur = (key: NumericPreference) => {
    flush()
    if (!validSettings({ ...saved.current, [key]: draftRef.current[key] })) {
      const next = { ...draftRef.current, [key]: saved.current[key] }
      draftRef.current = next
      setDraft(next)
      dirty.current.delete(key)
    }
  }
  const setNotifications = (enabled: boolean) => {
    if (!canEdit) return
    flush()
    const next = { ...saved.current, notificationsEnabled: enabled }
    saved.current = next
    draftRef.current = { ...draftRef.current, notificationsEnabled: enabled }
    setDraft(draftRef.current)
    dispatch({ type: 'settings', settings: next })
  }
  return { draft, change, blur, flush, setNotifications }
}
