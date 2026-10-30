import { useCallback, useEffect, useRef, useState } from 'react'
import { type Action, freshData, transition } from '../services/engine'
import {
  clear,
  isRecovering,
  load,
  save,
  STORAGE_KEY,
} from '../services/storage'
import { claimOwnership } from '../services/ownership'
import type { AppData, WaterEntry } from '../types'
import { useToasts } from './useToasts'

export function useBuddy() {
  const [initial] = useState(load)
  const [data, setData] = useState(initial.data)
  const dataRef = useRef(data)
  const [warning, setWarning] = useState(initial.warning)
  const [blocked, setBlocked] = useState(initial.blocked)
  const blockedRef = useRef(initial.blocked)
  const [owner, setOwner] = useState(false)
  const ownerRef = useRef(false)
  const [ownershipPending, setOwnershipPending] = useState(true)
  const [unsupported, setUnsupported] = useState(false)
  const [now, setNow] = useState(Date.now())
  const { messages, notify: setMessage, dismiss: dismissMessage } = useToasts()
  const [undo, setUndo] = useState<WaterEntry | null>(null)
  const liveNotification = useRef<Notification | null>(null)
  const replace = useCallback((next: AppData) => {
    dataRef.current = next
    setData(next)
  }, [])
  const commit = useCallback(
    (next: AppData) => {
      const failure = save(next)
      if (failure) setWarning(failure)
      replace(next)
    },
    [replace],
  )
  const dispatch = useCallback(
    (action: Action) => {
      if (!ownerRef.current || blockedRef.current) return
      const timestamp = Date.now()
      const current = dataRef.current
      const recovered = isRecovering(current.active, timestamp)
      const checked = transition(current, { type: 'tick' }, timestamp)
      if (recovered)
        setMessage('Your session was paused while the app was inactive.')
      const next = transition(checked, action, timestamp)
      if (next !== current) commit(next)
      setNow(timestamp)
    },
    [commit],
  )

  useEffect(() => {
    // Allow the previous document's lock to release during a normal refresh.
    // Editing remains disabled while ownership is being established.
    const pendingTimeout = window.setTimeout(
      () => setOwnershipPending(false),
      350,
    )
    const acquire = () => {
      window.clearTimeout(pendingTimeout)
      const result = load()
      blockedRef.current = result.blocked
      setBlocked(result.blocked)
      setWarning(result.warning)
      replace(result.data)
      ownerRef.current = true
      setOwner(true)
      setOwnershipPending(false)
      if (!result.blocked) {
        const timestamp = Date.now()
        if (isRecovering(result.data.active, timestamp))
          setMessage('Your session was paused while the app was inactive.')
        const next = transition(result.data, { type: 'tick' }, timestamp)
        if (next !== result.data) commit(next)
      }
    }
    const release = claimOwnership(acquire, () => {
      window.clearTimeout(pendingTimeout)
      setUnsupported(true)
      setOwnershipPending(false)
    })
    const sync = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || ownerRef.current) return
      const result = load()
      replace(result.data)
      setWarning(result.warning)
      blockedRef.current = result.blocked
      setBlocked(result.blocked)
      setUndo(null)
    }
    window.addEventListener('storage', sync)
    return () => {
      window.clearTimeout(pendingTimeout)
      ownerRef.current = false
      release()
      window.removeEventListener('storage', sync)
    }
  }, [commit, replace])

  useEffect(() => {
    const tick = () => {
      const timestamp = Date.now()
      setNow(timestamp)
      if (!ownerRef.current || blockedRef.current) return
      const current = dataRef.current
      if (isRecovering(current.active, timestamp))
        setMessage('Your session was paused while the app was inactive.')
      const next = transition(current, { type: 'tick' }, timestamp)
      if (next !== current) commit(next)
    }
    const interval = window.setInterval(tick, 1000)
    window.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      clearInterval(interval)
      window.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [commit])

  useEffect(() => {
    const eventId = data.active?.dueEventId
    if (
      !eventId ||
      !data.settings.notificationsEnabled ||
      data.active?.phase !== 'due' ||
      !owner ||
      blocked ||
      data.notifiedEvents.includes(eventId)
    )
      return
    // Persist delivery ownership before invoking the platform API, avoiding replay on refresh.
    dispatch({ type: 'notified', id: eventId })
    if (!('Notification' in window) || Notification.permission !== 'granted')
      return
    try {
      liveNotification.current = new Notification('A little room to move', {
        body: 'Your movement break is ready. Come back to focusebuddy when you’re ready.',
        tag: 'posture-buddy:break',
      })
    } catch {
      setMessage(
        'Desktop notification could not be delivered. Your break reminder is here in the app.',
      )
    }
  }, [data, owner, blocked, dispatch])
  useEffect(() => {
    if (
      data.active?.phase !== 'due' ||
      !data.settings.notificationsEnabled ||
      !owner
    ) {
      liveNotification.current?.close()
      liveNotification.current = null
    }
  }, [data.active?.phase, data.settings.notificationsEnabled, owner])
  useEffect(
    () => () => {
      liveNotification.current?.close()
    },
    [],
  )

  // Only the writable tab claims delivery. The persistent in-app reminder stays
  // available until completion, snooze, or dismissal, including after reload.
  const taskNotification = useRef<Notification | null>(null)
  useEffect(() => {
    if (!owner || blocked) return
    const due = dataRef.current.tasks.filter(
      (task) =>
        task.completedAt === null &&
        task.reminderStatus === 'due' &&
        !task.notificationSent,
    )
    if (!due.length) return
    due.forEach((task) => dispatch({ type: 'task-notified', id: task.id }))
    if (
      !data.settings.notificationsEnabled ||
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    )
      return
    try {
      taskNotification.current?.close()
      taskNotification.current = new Notification(
        due.length === 1 ? 'A little nudge' : `${due.length} task reminders`,
        {
          body:
            due.length === 1
              ? due[0].title
              : `${due[0].title} and ${due.length - 1} more. Open focusebuddy to review.`,
          tag: 'focusebuddy:tasks',
        },
      )
      taskNotification.current.onclick = () => {
        window.focus()
      }
    } catch {
      setMessage(
        'Desktop notification could not be delivered. Your task reminder is here in the app.',
      )
    }
  }, [
    data.tasks,
    data.settings.notificationsEnabled,
    owner,
    blocked,
    dispatch,
    setMessage,
  ])
  useEffect(() => {
    if (
      !owner ||
      !data.settings.notificationsEnabled ||
      !data.tasks.some(
        (task) => task.completedAt === null && task.reminderStatus === 'due',
      )
    ) {
      taskNotification.current?.close()
      taskNotification.current = null
    }
  }, [data.tasks, data.settings.notificationsEnabled, owner])
  useEffect(
    () => () => {
      taskNotification.current?.close()
    },
    [],
  )

  const addWater = (amount: number) => {
    const id = crypto.randomUUID()
    dispatch({ type: 'water-add', amount, id })
    const entry = dataRef.current.water.find((e) => e.id === id)
    if (entry) {
      setUndo({ ...entry })
      setMessage(`${amount} ml added. A small moment for yourself.`)
    }
  }
  const undoWater = () => {
    if (!undo) return
    const entry = dataRef.current.water.find((e) => e.id === undo.id)
    if (
      entry &&
      entry.amountMl === undo.amountMl &&
      entry.timestamp === undo.timestamp
    ) {
      dispatch({ type: 'water-delete', id: undo.id })
      setMessage('Last water addition undone.')
    }
    setUndo(null)
  }
  const clearAll = () => {
    if (!ownerRef.current) return
    const success = clear()
    blockedRef.current = false
    setBlocked(false)
    setUndo(null)
    replace(freshData())
    setWarning(
      success
        ? ''
        : 'Saved data could not be cleared. This tab has been reset, but old data may return after reload.',
    )
    setMessage(
      success
        ? 'Application data cleared. A fresh start.'
        : 'This tab has been reset.',
    )
  }
  const enableFallback = () => {
    const result = load()
    replace(result.data)
    setWarning(result.warning)
    blockedRef.current = result.blocked
    setBlocked(result.blocked)
    ownerRef.current = true
    setOwner(true)
    setOwnershipPending(false)
    if (!result.blocked)
      commit(transition(result.data, { type: 'tick' }, Date.now()))
  }
  return {
    data,
    now,
    warning,
    blocked,
    owner,
    ownershipPending,
    unsupported,
    canEdit: owner && !blocked,
    messages,
    dismissMessage,
    setMessage,
    dispatch,
    addWater,
    undoWater,
    undo,
    invalidateUndo: (id?: string) =>
      setUndo((current) => (!id || current?.id === id ? null : current)),
    clearAll,
    enableFallback,
  }
}
