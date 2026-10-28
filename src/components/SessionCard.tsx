import {
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
import { clock, duration, inDay, MINUTE, workDuration } from '../utils/time'

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
  const completed = data.breaks.filter(
    (e) => inDay(e.timestamp, now) && e.status === 'completed',
  ).length
  const title =
    phase === 'due'
      ? 'Time for a break'
      : phase === 'ready'
        ? 'Break complete'
        : phase === 'paused'
          ? 'Session paused'
          : breakPhase
            ? 'On a break'
            : 'Work session'
  return (
    <section
      className={`card session-card ${breakPhase || phase === 'due' ? 'break-theme' : ''}`}
      aria-labelledby="session-heading"
    >
      <div className="card-heading">
        <h2 id="session-heading">
          <Timer size={17} />
          {title}
        </h2>
        {(phase === 'working' || phase === 'due') && (
          <button
            className="icon-button"
            disabled={disabled}
            aria-label="Reset break countdown"
            title="Reset break countdown"
            onClick={() => dispatch({ type: 'reset-countdown' })}
          >
            <RotateCcw size={16} />
          </button>
        )}
      </div>
      <div className="session-content">
        <div className="session-copy">
          <h3>
            {phase === 'paused' ? (
              <>
                Your time.
                <br />
                <span>Your pace.</span>
              </>
            ) : phase === 'due' ? (
              <>
                A little room
                <br />
                <span>to move.</span>
              </>
            ) : phase === 'ready' ? (
              <>
                Feel refreshed?
                <br />
                <span>Ease back in.</span>
              </>
            ) : breakPhase ? (
              <>
                Step away.
                <br />
                <span>Come back clearer.</span>
              </>
            ) : (
              <>
                Find your focus.
                <br />
                <span>We’ll mind the breaks.</span>
              </>
            )}
          </h3>
          <p>
            {phase === 'paused'
              ? 'Pick up where you left off, whenever you’re ready.'
              : phase === 'due'
                ? 'Stand up, stretch, or take a short walk.'
                : phase === 'ready'
                  ? 'Return to work when you’re ready.'
                  : breakPhase
                    ? 'Look away. Let your shoulders soften.'
                    : 'Focused work, with a little room to reset.'}
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
                ? 'Stand up and stretch'
                : phase === 'ready'
                  ? 'Ready to return'
                  : phase === 'paused'
                    ? 'Timer paused'
                    : breakPhase
                      ? 'Break remaining'
                      : active
                        ? 'Until your next break'
                        : `${data.settings.workIntervalMinutes} min work · ${data.settings.breakDurationMinutes} min break`}
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
          {active && session
            ? `${clock(workDuration(data, now, undefined, session))} this session`
            : `${duration(workDuration(data, now, now))} worked today`}
        </span>
        <span>
          {active ? `${duration(workDuration(data, now, now))} today · ` : ''}
          {completed} {completed === 1 ? 'break' : 'breaks'} completed
        </span>
      </div>
    </section>
  )
}
