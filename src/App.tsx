import { useState } from 'react'
import {
  Activity,
  ArrowRight,
  ArrowUpRight,
  Check,
  ChevronRight,
  Clock3,
  Coffee,
  Droplets,
  Leaf,
  LockKeyhole,
  Settings2,
  ShieldCheck,
  Sun,
  X,
  AlertCircle,
} from 'lucide-react'
import { useBuddy } from './hooks/useBuddy'
import { SessionCard } from './components/SessionCard'
import { WaterCard } from './components/WaterCard'
import { History } from './components/History'
import { Settings } from './components/Settings'
import { duration, inDay, workDuration } from './utils/time'

export default function App() {
  const buddy = useBuddy()
  const { data, now, canEdit } = buddy
  const [tab, setTab] = useState<'today' | 'history'>('today')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const todayWater = data.water.filter((e) => inDay(e.timestamp, now))
  const total = todayWater.reduce((n, e) => n + e.amountMl, 0)
  const completed = data.breaks.filter(
    (e) => inDay(e.timestamp, now) && e.status === 'completed',
  ).length
  const worked = workDuration(data, now, now)
  const hour = new Date(now).getHours()
  const greeting =
    hour < 12
      ? 'Good morning.'
      : hour < 17
        ? 'Good afternoon.'
        : 'Good evening.'
  const date = new Date(now).toLocaleDateString([], {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  })
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="app-header">
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault()
            setTab('today')
          }}
          aria-label="Posture Buddy home"
        >
          <span className="brand-mark">
            <Activity size={21} strokeWidth={2} />
          </span>
          <span>
            posture<span className="brand-light">buddy</span>
            <span className="brand-period">.</span>
          </span>
        </a>
        <nav aria-label="Main navigation">
          <button
            className={tab === 'today' ? 'selected' : ''}
            aria-current={tab === 'today' ? 'page' : undefined}
            onClick={() => setTab('today')}
          >
            Today
          </button>
          <button
            className={tab === 'history' ? 'selected' : ''}
            aria-current={tab === 'history' ? 'page' : undefined}
            onClick={() => setTab('history')}
          >
            History
          </button>
        </nav>
        <div className="header-right">
          <span className="local-tag">
            <span />
            All yours. All local.
          </span>
          <button
            className="icon-button settings-button"
            aria-label="Open settings"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings2 size={19} />
          </button>
        </div>
      </header>
      <main id="main">
        {buddy.warning && (
          <div className="notice warning" role="alert">
            <AlertCircle size={19} />
            <span>{buddy.warning}</span>
            <button
              className="text-button"
              onClick={() => setSettingsOpen(true)}
            >
              Settings <ChevronRight size={15} />
            </button>
          </div>
        )}
        {!buddy.owner && (
          <div className="notice" role="status">
            <LockKeyhole size={18} />
            <span>
              {buddy.unsupported
                ? 'This browser cannot coordinate tabs. Close every other Posture Buddy tab before continuing.'
                : 'Read-only while another tab is active. Close that tab to continue here.'}
            </span>
            {buddy.unsupported && (
              <button className="text-button" onClick={buddy.enableFallback}>
                I have closed other tabs <ArrowRight size={15} />
              </button>
            )}
          </div>
        )}
        <div className="page-heading">
          <div>
            <p className="eyebrow">
              <Sun size={14} />
              {date}
            </p>
            <h1>
              {tab === 'today' ? greeting : 'Your days, at a glance.'}
              <span className="heading-leaf" aria-hidden="true">
                <Leaf size={29} strokeWidth={1.4} />
              </span>
            </h1>
            <p>
              {tab === 'today'
                ? 'A little more balance for your workday.'
                : 'Small moments add up. Here’s your record.'}
            </p>
          </div>
          <div className="day-label">
            <span className="subtle-dot" />
            {data.active?.phase === 'paused'
              ? 'A moment on pause'
              : data.active
                ? 'Your workday is in motion'
                : 'A fresh start, whenever you’re ready'}
          </div>
        </div>
        {tab === 'today' ? (
          <>
            <div className="dashboard-grid">
              <SessionCard
                data={data}
                now={now}
                disabled={!canEdit}
                dispatch={buddy.dispatch}
              />
              <WaterCard
                data={data}
                now={now}
                disabled={!canEdit}
                addWater={buddy.addWater}
                undo={!!buddy.undo}
                undoWater={buddy.undoWater}
                openHistory={() => setTab('history')}
              />
            </div>
            <section
              className="summary-section"
              aria-labelledby="summary-heading"
            >
              <div className="section-title">
                <h2 id="summary-heading">
                  Your day, so far<span>Small steps count.</span>
                </h2>
                <span className="section-label">TODAY’S OVERVIEW</span>
              </div>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="stat-icon blue">
                    <Droplets size={20} strokeWidth={1.5} />
                  </span>
                  <div>
                    <strong>
                      {total.toLocaleString()}
                      <small>ml</small>
                    </strong>
                    <span>Water logged</span>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="stat-icon mint">
                    <Coffee size={20} strokeWidth={1.5} />
                  </span>
                  <div>
                    <strong>
                      {completed}
                      <small>{completed === 1 ? 'break' : 'breaks'}</small>
                    </strong>
                    <span>Movement moments</span>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="stat-icon amber">
                    <Clock3 size={20} strokeWidth={1.5} />
                  </span>
                  <div>
                    <strong>{duration(worked)}</strong>
                    <span>Time spent working</span>
                  </div>
                </div>
                <div className="summary-item">
                  <span className="stat-icon lavender">
                    <Check size={20} strokeWidth={1.5} />
                  </span>
                  <div>
                    <strong>
                      {todayWater.length}
                      <small>
                        {todayWater.length === 1 ? 'entry' : 'entries'}
                      </small>
                    </strong>
                    <span>Water check-ins</span>
                  </div>
                </div>
              </div>
            </section>
            <div className="bottom-grid">
              <section className="gentle-note">
                <div className="note-leaf">
                  <Leaf size={26} strokeWidth={1.3} />
                </div>
                <div>
                  <p className="eyebrow">A GENTLE REMINDER</p>
                  <h3>Your best posture is your next one.</h3>
                  <p>
                    Unclench your jaw. Let your shoulders soften.
                    <br />
                    Make a little room to move throughout the day.
                  </p>
                </div>
                <span className="note-decoration" aria-hidden="true">
                  <Leaf size={96} strokeWidth={0.6} />
                </span>
              </section>
              <section className="recent-card">
                <div>
                  <h3>Little moments, logged.</h3>
                  <button
                    className="text-button"
                    onClick={() => setTab('history')}
                    aria-label="View all activity"
                  >
                    <ArrowUpRight size={18} />
                  </button>
                </div>
                {todayWater.length ? (
                  <p>
                    <span className="subtle-dot blue-dot" />
                    Last sip: {todayWater[todayWater.length - 1].amountMl} ml
                    <span className="recent-time">
                      {new Date(
                        todayWater[todayWater.length - 1].timestamp,
                      ).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </p>
                ) : (
                  <p className="muted">
                    Your first sip is a good place to start.
                  </p>
                )}
                <span className="fine-print">
                  A simple record. No scores, no pressure.
                </span>
              </section>
            </div>
          </>
        ) : (
          <History
            data={data}
            now={now}
            disabled={!canEdit}
            dispatch={buddy.dispatch}
            invalidateUndo={buddy.invalidateUndo}
            notify={buddy.setMessage}
          />
        )}
        <footer className="app-footer">
          <span>
            <ShieldCheck size={14} />
            Private by design. Stored on this device.
          </span>
          <span>
            <span
              className={`subtle-dot ${buddy.warning ? 'amber-dot' : ''}`}
            />
            {buddy.warning
              ? 'Storage needs attention'
              : buddy.owner
                ? 'Local mode'
                : 'Read-only mode'}
            <span className="footer-divider" />v{__APP_VERSION__}
          </span>
        </footer>
      </main>
      <div
        className="toast-region"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        {buddy.message && (
          <div className="toast">
            <span className="toast-check">
              <Check size={16} />
            </span>
            <span>{buddy.message}</span>
            <button
              className="icon-button"
              aria-label="Dismiss message"
              onClick={() => buddy.setMessage('')}
            >
              <X size={16} />
            </button>
          </div>
        )}
      </div>
      {settingsOpen && (
        <Settings
          settings={data.settings}
          canEdit={canEdit}
          owner={buddy.owner}
          blocked={buddy.blocked}
          dispatch={buddy.dispatch}
          clearAll={buddy.clearAll}
          onClose={() => setSettingsOpen(false)}
          notify={buddy.setMessage}
          invalidateUndo={buddy.invalidateUndo}
        />
      )}
    </div>
  )
}
