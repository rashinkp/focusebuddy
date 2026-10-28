import { useState, type FormEvent } from 'react'
import { Bell, Check, ShieldCheck, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import type { Settings as Preferences } from '../types'
import { validSettings, type Action } from '../services/engine'

export function Settings({
  settings,
  canEdit,
  owner,
  blocked,
  dispatch,
  clearAll,
  onClose,
  notify,
  invalidateUndo,
}: {
  settings: Preferences
  canEdit: boolean
  owner: boolean
  blocked: boolean
  dispatch: (action: Action) => void
  clearAll: () => void
  onClose: () => void
  notify: (message: string) => void
  invalidateUndo: () => void
}) {
  const [draft, setDraft] = useState(settings)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState<'today' | 'all' | null>(null)
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported',
  )
  const [pending, setPending] = useState(false)
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!validSettings(draft)) {
      setError('Use whole numbers within the ranges shown below.')
      return
    }
    dispatch({ type: 'settings', settings: draft })
    notify('Preferences saved.')
    onClose()
  }
  const toggleNotifications = async () => {
    if (!canEdit) return
    if (draft.notificationsEnabled) {
      const next = { ...draft, notificationsEnabled: false }
      setDraft(next)
      dispatch({
        type: 'settings',
        settings: { ...settings, notificationsEnabled: false },
      })
      return
    }
    if (!('Notification' in window)) return
    setPending(true)
    try {
      const result =
        Notification.permission === 'default'
          ? await Notification.requestPermission()
          : Notification.permission
      setPermission(result)
      const enabled = result === 'granted'
      setDraft((current) => ({ ...current, notificationsEnabled: enabled }))
      dispatch({
        type: 'settings',
        settings: { ...settings, notificationsEnabled: enabled },
      })
      if (!enabled)
        notify(
          'Desktop notifications are unavailable. In-app reminders are still enabled.',
        )
    } catch {
      setPermission('unavailable')
      notify(
        'Desktop notifications could not be enabled. In-app reminders are still enabled.',
      )
    } finally {
      setPending(false)
    }
  }
  return (
    <Modal title="Make it your own" onClose={onClose}>
      <p className="modal-intro">
        A rhythm that fits your day. All preferences stay on this device.
      </p>
      <form onSubmit={submit} noValidate>
        <fieldset disabled={!canEdit || pending} className="settings-fields">
          <legend className="sr-only">Wellness preferences</legend>
          <label className="setting-row">
            <span>
              <strong>Daily water goal</strong>
              <small>Your preference, not medical advice. 250–10,000 ml.</small>
            </span>
            <div className="setting-input">
              <input
                aria-label="Daily water goal"
                type="number"
                min="250"
                max="10000"
                step="1"
                value={draft.dailyWaterGoalMl || ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    dailyWaterGoalMl: Number(e.target.value),
                  })
                }
              />
              <span>ml</span>
            </div>
          </label>
          <label className="setting-row">
            <span>
              <strong>Work interval</strong>
              <small>1–180 minutes. Applies to your next interval.</small>
            </span>
            <div className="setting-input">
              <input
                aria-label="Work interval"
                type="number"
                min="1"
                max="180"
                step="1"
                value={draft.workIntervalMinutes || ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    workIntervalMinutes: Number(e.target.value),
                  })
                }
              />
              <span>min</span>
            </div>
          </label>
          <label className="setting-row">
            <span>
              <strong>Movement break</strong>
              <small>1–60 minutes. Applies to your next break.</small>
            </span>
            <div className="setting-input">
              <input
                aria-label="Break duration"
                type="number"
                min="1"
                max="60"
                step="1"
                value={draft.breakDurationMinutes || ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    breakDurationMinutes: Number(e.target.value),
                  })
                }
              />
              <span>min</span>
            </div>
          </label>
          <div className="notification-setting">
            <div className="setting-row">
              <span>
                <strong>
                  <Bell size={16} />
                  Desktop notifications
                </strong>
                <small>
                  {permission === 'granted'
                    ? 'Browser permission granted.'
                    : permission === 'denied'
                      ? 'Blocked in browser settings. In-app reminders remain on.'
                      : permission === 'default'
                        ? 'Optional. Permission is requested only when enabled.'
                        : 'Unavailable in this browser. In-app reminders remain on.'}
                </small>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={draft.notificationsEnabled}
                aria-label="Desktop notifications"
                disabled={
                  pending ||
                  (!draft.notificationsEnabled &&
                    (permission === 'unsupported' ||
                      permission === 'denied' ||
                      permission === 'unavailable'))
                }
                className={`switch ${draft.notificationsEnabled ? 'on' : ''}`}
                onClick={() => void toggleNotifications()}
              >
                <span />
              </button>
            </div>
            <p className="fine-print">
              Keep Posture Buddy open for reminders. Browsers may delay timers
              and notifications when suspended or closed. Notification changes
              apply immediately.
            </p>
          </div>
        </fieldset>
        {error && (
          <p className="field-error" role="alert">
            {error}
          </p>
        )}
        <div className="settings-save">
          <button className="button primary" disabled={!canEdit || pending}>
            <Check size={16} />
            Save preferences
          </button>
        </div>
      </form>
      <div className="privacy-note">
        <ShieldCheck size={21} />
        <div>
          <strong>Just you and your device.</strong>
          <p>
            No accounts, uploads, analytics, or camera access. Browser storage
            is not a backup and can be cleared by your browser.
          </p>
        </div>
      </div>
      <div className="data-actions">
        <h3>Your data</h3>
        <button
          className="text-button"
          disabled={!canEdit}
          onClick={() => setConfirmation('today')}
        >
          Reset today’s activity
        </button>
        <button
          className="text-button danger-text"
          disabled={!owner}
          onClick={() => setConfirmation('all')}
        >
          <Trash2 size={14} />
          {blocked
            ? 'Reset unreadable saved data'
            : 'Clear all application data'}
        </button>
        <span className="fine-print">
          Posture Buddy · Version {__APP_VERSION__}
        </span>
      </div>
      {confirmation && (
        <Modal
          title={
            confirmation === 'today'
              ? 'Reset today’s activity?'
              : 'Clear all application data?'
          }
          onClose={() => setConfirmation(null)}
        >
          <p className="modal-intro">
            {confirmation === 'today'
              ? 'This ends your current session and removes today’s water, break records, and work time. Earlier activity and preferences are kept. This cannot be undone.'
              : 'This ends your session and deletes all Posture Buddy history and preferences on this browser. Other applications are unaffected. This cannot be undone.'}
          </p>
          <div className="confirmation-actions">
            <button
              className="button secondary"
              onClick={() => setConfirmation(null)}
            >
              Keep my data
            </button>
            <button
              className="button danger"
              onClick={() => {
                if (confirmation === 'all') clearAll()
                else {
                  dispatch({ type: 'reset-today' })
                  invalidateUndo()
                  notify(
                    'Today’s activity has been reset. Earlier history is safe.',
                  )
                }
                setConfirmation(null)
                onClose()
              }}
            >
              {confirmation === 'today' ? 'Reset today' : 'Clear all data'}
            </button>
          </div>
        </Modal>
      )}
    </Modal>
  )
}
