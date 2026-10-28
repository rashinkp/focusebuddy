import {
  ArrowUpRight,
  Check,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Square,
  Timer,
  Wind,
} from 'lucide-react'
import type { AppData } from '../types'
import type { Action } from '../services/engine'
import { clock, MINUTE, workDuration } from '../utils/time'

export function SessionCard({
  data,
  now,
  disabled,
  dispatch,
}: {
  data: AppData
  now: number
  disabled: boolean
  dispatch: (action: Action) => void
}) {
  const active = data.active
  const phase = active?.phase
  const breakPhase =
    phase === 'break' ||
    phase === 'ready' ||
    (phase === 'paused' &&
      (active?.resumePhase === 'break' || active?.resumePhase === 'ready'))
  const remaining = active
    ? active.deadline === null
      ? active.remainingMs
      : Math.max(0, active.deadline - now)
    : data.settings.workIntervalMinutes * MINUTE
  const full = breakPhase
    ? (active?.plannedBreakMs ?? 1)
    : data.settings.workIntervalMinutes * MINUTE
  const progress = active ? Math.min(1, Math.max(0, 1 - remaining / full)) : 0
  const session = data.sessions.find((s) => s.id === active?.sessionId)
  const label =
    phase === 'paused'
      ? 'SESSION PAUSED'
      : phase === 'due'
        ? 'TIME TO MOVE'
        : phase === 'ready'
          ? 'NICE LITTLE RESET'
          : breakPhase
            ? 'TAKE A BREATHER'
            : active
              ? 'ONE THING AT A TIME'
              : 'MAKE SPACE TO FOCUS'
  return (
    <section
      className={`card session-card ${breakPhase || phase === 'due' ? 'break-theme' : ''}`}
      aria-labelledby="session-heading"
    >
      <div className="card-heading">
        <span className="section-label">
          <Timer size={17} /> WORK & MOVEMENT
        </span>
        <span
          className={`status-tag ${active && phase !== 'paused' ? 'live' : ''}`}
        >
          <span />
          {phase === 'paused'
            ? 'Paused'
            : active
              ? 'In session'
              : 'Ready when you are'}
        </span>
      </div>
      <div className="session-content">
        <div className="session-copy">
          <p className="eyebrow">{label}</p>
          <h2 id="session-heading">
            {phase === 'due' ? (
              <>
                A little room
                <br />
                to move.
              </>
            ) : phase === 'ready' ? (
              <>
                Feel refreshed?
                <br />
                Ease back in.
              </>
            ) : breakPhase ? (
              <>
                Step away.
                <br />
                Come back clearer.
              </>
            ) : phase === 'paused' ? (
              <>
                Your time.
                <br />
                Your pace.
              </>
            ) : (
              <>
                Find your focus.
                <br />
                <span>We’ll mind the breaks.</span>
              </>
            )}
          </h2>
          <p className="description">
            {phase === 'due'
              ? 'Stand up, stretch, or take a short walk. Start your break whenever you’re ready.'
              : phase === 'ready'
                ? 'Your break timer is done. Complete your break when you’re ready to return.'
                : breakPhase
                  ? 'Look away from the screen. Relax your shoulders. There’s no rush.'
                  : phase === 'paused'
                    ? 'Your timer is on hold. Pick up exactly where you left off.'
                    : 'A gentle rhythm of focused work and small moments to reset.'}
          </p>
        </div>
        <div
          className="timer-ring"
          role="img"
          aria-label={
            phase === 'due'
              ? 'Movement break due'
              : `${breakPhase ? 'Break' : 'Next break'} timer: ${clock(remaining)}`
          }
        >
          <svg viewBox="0 0 220 220" aria-hidden="true">
            <circle className="ring-track" cx="110" cy="110" r="98" />
            <circle
              className="ring-fill"
              cx="110"
              cy="110"
              r="98"
              pathLength="100"
              strokeDasharray={`${progress * 100} 100`}
            />
          </svg>
          <div className="ring-center">
            {phase === 'due' ? (
              <Wind size={43} strokeWidth={1.3} />
            ) : phase === 'ready' ? (
              <Check size={40} strokeWidth={1.4} />
            ) : (
              <strong>{clock(remaining)}</strong>
            )}
            <span>
              {phase === 'due'
                ? 'Your break is ready'
                : phase === 'ready'
                  ? 'Ready to return'
                  : phase === 'paused'
                    ? 'Timer paused'
                    : breakPhase
                      ? 'A moment for you'
                      : 'Until your next break'}
            </span>
          </div>
        </div>
      </div>
      <div className="session-actions">
        {!active && (
          <button
            className="button primary"
            disabled={disabled}
            onClick={() => dispatch({ type: 'start' })}
          >
            <Play size={16} fill="currentColor" />
            Start work session
          </button>
        )}
        {phase === 'working' && (
          <button
            className="button primary"
            disabled={disabled}
            onClick={() => dispatch({ type: 'pause' })}
          >
            <Pause size={17} />
            Pause session
          </button>
        )}
        {phase === 'paused' && (
          <button
            className="button primary"
            disabled={disabled}
            onClick={() => dispatch({ type: 'resume' })}
          >
            <Play size={16} />
            Resume session
          </button>
        )}
        {phase === 'due' && (
          <>
            <button
              className="button primary"
              disabled={disabled}
              onClick={() => dispatch({ type: 'start-break' })}
            >
              <Coffee size={17} />
              Start break
            </button>
            <button
              className="button secondary"
              disabled={disabled}
              onClick={() => dispatch({ type: 'snooze' })}
            >
              Snooze 5 min
            </button>
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => dispatch({ type: 'skip' })}
            >
              Skip
            </button>
          </>
        )}
        {phase === 'break' && (
          <>
            <button
              className="button primary"
              disabled={disabled}
              onClick={() => dispatch({ type: 'pause' })}
            >
              <Pause size={17} />
              Pause break
            </button>
            <button
              className="text-button"
              disabled={disabled}
              onClick={() => dispatch({ type: 'end-break' })}
            >
              End break early
            </button>
          </>
        )}
        {phase === 'ready' && (
          <button
            className="button primary"
            disabled={disabled}
            onClick={() => dispatch({ type: 'complete-break' })}
          >
            <Check size={17} />
            Complete break & resume work
          </button>
        )}
        {active && (
          <button
            className="icon-button end-button"
            disabled={disabled}
            aria-label="End session"
            title="End session"
            onClick={() => dispatch({ type: 'end' })}
          >
            <Square size={16} />
          </button>
        )}
        {phase === 'due' && (
          <button
            className="icon-button"
            disabled={disabled}
            aria-label="Pause session"
            title="Pause session"
            onClick={() => dispatch({ type: 'pause' })}
          >
            <Pause size={17} />
          </button>
        )}
      </div>
      <div className="session-bottom">
        <span>
          {active && session ? (
            <>
              <span className="subtle-dot" />
              {clock(workDuration(data, now, undefined, session))} worked this
              session
            </>
          ) : (
            <>
              <Coffee size={14} />
              {data.settings.workIntervalMinutes} min work{' '}
              <span className="separator-dot">·</span>{' '}
              {data.settings.breakDurationMinutes} min break
            </>
          )}
        </span>
        {phase === 'working' || phase === 'due' ? (
          <button
            className="text-button small"
            disabled={disabled}
            onClick={() => dispatch({ type: 'reset-countdown' })}
          >
            <RotateCcw size={13} />
            Reset break countdown
          </button>
        ) : (
          <span className="small muted">
            Small breaks. Better days.
            <ArrowUpRight size={13} />
          </span>
        )}
      </div>
    </section>
  )
}
