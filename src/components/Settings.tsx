import { useState } from 'react'
import { Bell, ShieldCheck, Trash2 } from 'lucide-react'
import { Modal } from './Modal'
import type { Settings as Preferences } from '../types'
import { type Action } from '../services/engine'
import { usePreferenceDraft } from '../hooks/usePreferenceDraft'

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
  const { draft, change, blur, flush, setNotifications } = usePreferenceDraft(
    settings,
    canEdit,
    dispatch,
  )
  const close = () => {
    flush()
    onClose()
  }
  const [confirmation, setConfirmation] = useState<'today' | 'all' | null>(null)
  const [permission, setPermission] = useState(
    'Notification' in window ? Notification.permission : 'unsupported',
  )
  const [pending, setPending] = useState(false)
  const toggleNotifications = async () => {
    if (!canEdit) return
    if (draft.notificationsEnabled) {
      setNotifications(false)
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
      setNotifications(enabled)
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
    <Modal title="Make it your own" onClose={close}>
      <p className="modal-intro settings-intro">
        A rhythm that fits your day. All preferences stay on this device.
      </p>
      <div className="preferences-form">
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
                  change('dailyWaterGoalMl', Number(e.target.value))
                }
                onBlur={() => blur('dailyWaterGoalMl')}
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
                  change('workIntervalMinutes', Number(e.target.value))
                }
                onBlur={() => blur('workIntervalMinutes')}
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
                  change('breakDurationMinutes', Number(e.target.value))
                }
                onBlur={() => blur('breakDurationMinutes')}
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
                  {permission === 'denied'
                    ? 'Blocked by your browser. Enable notifications in browser settings.'
                    : permission === 'unsupported' || permission === 'unavailable'
                      ? 'Unavailable in this browser.'
                      : 'Break and task reminders while the app is open.'}
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
          </div>
        </fieldset>
      </div>
      <div className="data-actions">
        <h3>Your data</h3>
        <div className="data-action-buttons">
          <button
            className="button secondary"
            disabled={!canEdit}
            onClick={() => setConfirmation('today')}
          >
            Reset today’s activity
          </button>
          <button
            className="button danger-outline"
            disabled={!owner}
            onClick={() => setConfirmation('all')}
          >
            <Trash2 size={14} />
            {blocked
              ? 'Reset unreadable saved data'
              : 'Clear all application data'}
          </button>
        </div>
      </div>
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
      <span className="fine-print settings-version">
        focusebuddy · Version {__APP_VERSION__}
      </span>
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
              ? 'This ends your current session and removes today’s water, break records, and work time. Tasks, earlier activity, and preferences are kept. This cannot be undone.'
              : 'This ends your session and deletes all focusebuddy tasks, history, and preferences on this browser. Other applications are unaffected. This cannot be undone.'}
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
