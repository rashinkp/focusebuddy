import { createPortal } from 'react-dom'
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type FormEvent,
} from 'react'
import {
  Bell,
  CalendarClock,
  Check,
  ChevronDown,
  ListTodo,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  X,
} from 'lucide-react'
import type { Task } from '../types'
import type { Action } from '../services/engine'
import { validTitle } from '../services/tasks'
import { taskReminderLabel } from '../utils/taskDates'
import { Modal } from './Modal'
import { TaskReminderPicker } from './TaskReminderPicker'

function ReminderChip({
  at,
  now,
  onRemove,
}: {
  at: number
  now: number
  onRemove: () => void
}) {
  return (
    <span className="task-reminder-chip">
      <Bell size={13} />
      {taskReminderLabel(at, now)}
      <button type="button" aria-label="Remove reminder" onClick={onRemove}>
        <X size={13} />
      </button>
    </span>
  )
}

function TaskRow({
  task,
  now,
  disabled,
  dispatch,
  onEdit,
  onToggle,
  finishing,
  arriving,
  notify,
}: {
  task: Task
  now: number
  disabled: boolean
  dispatch: (action: Action) => void
  onEdit: (reminder?: boolean) => void
  onToggle: () => void
  finishing?: 'up' | 'down'
  arriving?: 'up' | 'down'
  notify: (text: string) => void
}) {
  const trigger = useRef<HTMLButtonElement>(null)
  const menu = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const closeMenu = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      if (!trigger.current || !menu.current) return
      const anchor = trigger.current.getBoundingClientRect()
      const box = menu.current.getBoundingClientRect()
      const scroll = trigger.current
        .closest('.task-body')
        ?.getBoundingClientRect()
      if (
        scroll &&
        (anchor.bottom < scroll.top || anchor.top > scroll.bottom)
      ) {
        setOpen(false)
        return
      }
      setPosition({
        top: Math.max(
          8,
          Math.min(
            anchor.bottom + 4 + box.height <= innerHeight - 8
              ? anchor.bottom + 4
              : anchor.top - box.height - 4,
            innerHeight - box.height - 8,
          ),
        ),
        left: Math.max(
          8,
          Math.min(
            anchor.right - box.width,
            document.documentElement.clientWidth - box.width - 8,
          ),
        ),
      })
    }
    place()
    menu.current?.querySelector('button')?.focus()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])
  useEffect(() => {
    if (!open) return
    const outside = (event: Event) => {
      if (
        !menu.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        trigger.current?.focus()
      }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
      document.removeEventListener('keydown', escape)
    }
  }, [open])
  return (
    <li
      className={`task-row ${task.completedAt !== null ? 'is-complete' : ''} ${finishing ? `is-finishing finishing-${finishing}` : ''} ${arriving ? `is-arriving arriving-${arriving}` : ''}`}
      data-task-id={task.id}
    >
      <button
        className="task-check"
        role="checkbox"
        aria-checked={task.completedAt !== null}
        aria-label={`${task.completedAt === null ? 'Complete' : 'Reopen'} ${task.title}`}
        disabled={disabled}
        onClick={onToggle}
      >
        <span>{task.completedAt !== null && <Check size={14} />}</span>
      </button>
      <div className="task-row-copy">
        <span className="task-title">{task.title}</span>
        {task.reminderAt !== null &&
          (task.completedAt === null || finishing) && (
            <span
              className={`task-time ${task.reminderStatus === 'due' ? 'is-due' : ''}`}
            >
              <Bell size={12} />
              {finishing
                ? finishing === 'up'
                  ? 'Reopening · '
                  : 'Completed · '
                : task.reminderStatus === 'due'
                  ? 'Reminder due · '
                  : task.reminderStatus === 'dismissed'
                    ? 'Reminder off · '
                    : ''}
              {taskReminderLabel(task.reminderAt, now)}
            </span>
          )}
      </div>
      <div className="task-row-menu">
        <button
          type="button"
          ref={trigger}
          className="task-menu-trigger"
          aria-label={`Actions for ${task.title}`}
          aria-expanded={open}
          onClick={() => setOpen(!open)}
        >
          <MoreHorizontal size={18} />
        </button>
        {open &&
          createPortal(
            <div
              ref={menu}
              className="task-menu-panel"
              style={position}
              aria-label={`Task actions for ${task.title}`}
            >
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  closeMenu()
                  onEdit(false)
                }}
              >
                <Pencil size={14} />
                Edit task
              </button>
              {task.completedAt === null && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => {
                    closeMenu()
                    onEdit(true)
                  }}
                >
                  <CalendarClock size={14} />
                  {task.reminderAt === null
                    ? 'Add reminder'
                    : 'Change reminder'}
                </button>
              )}
              <button
                type="button"
                disabled={disabled}
                onClick={() => {
                  setOpen(false)
                  dispatch({ type: 'task-delete', id: task.id })
                  notify('Task deleted.')
                }}
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>,
            document.body,
          )}
      </div>
    </li>
  )
}

function EditTask({
  task,
  now,
  disabled,
  dispatch,
  onClose,
}: {
  task: Task
  now: number
  disabled: boolean
  dispatch: (action: Action) => void
  onClose: () => void
}) {
  const [title, setTitle] = useState(task.title)
  const [reminderAt, setReminderAt] = useState(task.reminderAt)
  const [picker, setPicker] = useState(false)
  const valid =
    validTitle(title) &&
    (reminderAt === task.reminderAt || reminderAt === null || reminderAt > now)
  return (
    <Modal title="Edit task" onClose={onClose}>
      <form
        className="task-edit-form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!disabled && valid) {
            dispatch({ type: 'task-edit', id: task.id, title, reminderAt })
            onClose()
          }
        }}
      >
        <label className="task-edit-label">
          Task
          <input
            autoFocus
            aria-label="Task title"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
          />
        </label>
        <div className="task-edit-reminder">
          <button
            type="button"
            className="text-button"
            disabled={disabled}
            onClick={() => setPicker((open) => !open)}
          >
            <CalendarClock size={16} />
            {reminderAt === null ? 'Add reminder' : 'Change reminder'}
          </button>
          {reminderAt !== null && (
            <ReminderChip
              at={reminderAt}
              now={now}
              onRemove={() => setReminderAt(null)}
            />
          )}
        </div>
        <div className="modal-actions">
          <button type="button" className="button secondary" onClick={onClose}>
            Cancel
          </button>
          <button className="button primary" disabled={disabled || !valid}>
            Save changes
          </button>
        </div>
      </form>
      {picker && (
        <TaskReminderPicker
          value={reminderAt}
          now={now}
          onSet={(at) => {
            setReminderAt(at)
            setPicker(false)
          }}
          onClose={() => setPicker(false)}
        />
      )}
    </Modal>
  )
}

export function TaskCard({
  tasks,
  now,
  disabled,
  dispatch,
  notify,
}: {
  tasks: Task[]
  now: number
  disabled: boolean
  dispatch: (action: Action) => void
  notify: (text: string) => void
}) {
  const [title, setTitle] = useState('')
  const [reminderAt, setReminderAt] = useState<number | null>(null)
  const [picker, setPicker] = useState(false)
  const [editing, setEditing] = useState<string | null>(null)
  const [reminding, setReminding] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)
  const body = useRef<HTMLDivElement>(null)
  const [finishing, setFinishing] = useState<
    Record<
      string,
      {
        until: number
        sortAt: number
        direction: 'up' | 'down'
        completedAt: number | null
      }
    >
  >({})
  const [reopened, setReopened] = useState<Record<string, number>>({})
  const [arriving, setArriving] = useState<Record<string, 'up' | 'down'>>({})
  useLayoutEffect(() => {
    if (Object.values(arriving).includes('up')) body.current?.scrollTo?.({ top: 0, behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })
  }, [arriving])
  useEffect(() => {
    if (!Object.keys(arriving).length) return
    const timer = window.setTimeout(() => setArriving({}), 280)
    return () => window.clearTimeout(timer)
  }, [arriving])
  useEffect(() => {
    const deadlines = Object.values(finishing).map((item) => item.until)
    if (!deadlines.length) return
    const timer = window.setTimeout(
      () => {
        const focusedRow =
          document.activeElement?.closest<HTMLElement>('[data-task-id]')
        if (
          focusedRow &&
          finishing[focusedRow.dataset.taskId!]?.until <= Date.now()
        )
          input.current?.focus({ preventScroll: true })
        const finished = Object.entries(finishing).filter(
          ([, item]) => item.until <= Date.now(),
        )
        setArriving((current) => ({
          ...current,
          ...Object.fromEntries(
            finished.map(([id, item]) => [id, item.direction]),
          ),
        }))
        setReopened((current) => ({
          ...current,
          ...Object.fromEntries(
            finished
              .filter(([, item]) => item.direction === 'up')
              .map(([id]) => [id, Date.now()]),
          ),
        }))
        setFinishing((current) =>
          Object.fromEntries(
            Object.entries(current).filter(
              ([, item]) => item.until > Date.now(),
            ),
          ),
        )
      },
      Math.max(0, Math.min(...deadlines) - Date.now()),
    )
    return () => window.clearTimeout(timer)
  }, [finishing])
  const sortAt = (task: Task) =>
    finishing[task.id]?.sortAt ??
    (task.reminderStatus === 'dismissed'
      ? Infinity
      : (task.reminderAt ?? Infinity))
  const pending = tasks
    .filter((task) =>
      finishing[task.id]
        ? finishing[task.id].direction === 'down'
        : task.completedAt === null,
    )
    .sort(
      (a, b) =>
        (reopened[b.id] ?? 0) - (reopened[a.id] ?? 0) ||
        sortAt(a) - sortAt(b) ||
        a.createdAt - b.createdAt,
    )
  const completed = tasks
    .filter((task) =>
      finishing[task.id]
        ? finishing[task.id].direction === 'up'
        : task.completedAt !== null,
    )
    .sort(
      (a, b) =>
        (b.completedAt ?? finishing[b.id]?.completedAt ?? 0) -
        (a.completedAt ?? finishing[a.id]?.completedAt ?? 0),
    )
  const showCompleted =
    completed.length > 0 ||
    Object.values(finishing).some((item) => item.direction === 'down')
  const completedCount = tasks.filter(
    (task) => task.completedAt !== null,
  ).length
  const toggleTask = (task: Task) => {
    if (disabled) return
    if (finishing[task.id])
      setFinishing((current) =>
        Object.fromEntries(
          Object.entries(current).filter(([id]) => id !== task.id),
        ),
      )
    else
      setFinishing((current) => ({
        ...current,
        [task.id]: {
          until: Date.now() + 2200,
          sortAt: sortAt(task),
          direction: task.completedAt === null ? 'down' : 'up',
          completedAt: task.completedAt,
        },
      }))
    dispatch({ type: 'task-toggle', id: task.id })
  }
  const editingTask = tasks.find((t) => t.id === editing)
  const reminderTask = tasks.find((t) => t.id === reminding)
  const valid = validTitle(title) && (reminderAt === null || reminderAt > now)
  const add = (e: FormEvent) => {
    e.preventDefault()
    if (!disabled && valid) {
      dispatch({
        type: 'task-add',
        id: crypto.randomUUID(),
        title,
        reminderAt,
      })
      setTitle('')
      setReminderAt(null)
      input.current?.focus()
    }
  }
  const row = (task: Task) => (
    <TaskRow
      key={task.id}
      task={task}
      now={now}
      disabled={disabled}
      dispatch={dispatch}
      onEdit={(reminder = false) => {
        if (reminder) setReminding(task.id)
        else setEditing(task.id)
      }}
      notify={notify}
      finishing={finishing[task.id]?.direction}
      arriving={arriving[task.id]}
      onToggle={() => toggleTask(task)}
    />
  )
  return (
    <section className="card tasks-card" aria-labelledby="tasks-heading">
      <div className="tasks-heading">
        <h2 id="tasks-heading">
          <ListTodo size={18} strokeWidth={1.7} />
          Tasks <span>{pending.length}</span>
        </h2>
        <span>One thing at a time.</span>
      </div>
      <div
        ref={body}
        className="task-body"
        role="region"
        aria-label="Task list"
        tabIndex={0}
      >
        {pending.length > 0 ? (
          <ul className="task-list">{pending.map(row)}</ul>
        ) : (
          <div className="tasks-empty">
            <span className="tasks-empty-icon" aria-hidden="true">
              {completed.length ? (
                <Check size={22} strokeWidth={1.5} />
              ) : (
                <ListTodo size={22} strokeWidth={1.5} />
              )}
            </span>
            <h3>{completed.length ? 'All clear for now.' : 'What’s next?'}</h3>
            <p>
              {completed.length
                ? 'A little room to take a breath.'
                : 'Add a task below. One thing at a time.'}
            </p>
          </div>
        )}
        <div
          className={`tasks-completed-shell ${showCompleted ? 'is-visible' : ''}`}
          aria-hidden={!showCompleted}
          inert={!showCompleted}
        >
          <details className="tasks-completed">
            <summary>
              <ChevronDown size={14} />
              Completed <span>{completedCount}</span>
            </summary>
            <ul className="task-list">{completed.map(row)}</ul>
          </details>
        </div>
      </div>
      <form className="task-composer" onSubmit={add}>
        <div className="task-input-row">
          <input
            ref={input}
            aria-label="New task"
            placeholder="What do you need to do?"
            autoComplete="off"
            maxLength={200}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={disabled}
          />
          <div
            className={`task-schedule-group ${reminderAt !== null ? 'has-reminder' : ''} ${reminderAt !== null && reminderAt <= now ? 'is-expired' : ''}`}
          >
            <button
              type="button"
              className={`icon-button task-schedule ${reminderAt !== null ? 'has-reminder' : ''}`}
              aria-label={
                reminderAt === null
                  ? 'Add task reminder'
                  : `Change task reminder: ${taskReminderLabel(reminderAt, now)}`
              }
              aria-haspopup="dialog"
              aria-expanded={picker}
              title={
                reminderAt === null
                  ? 'Add reminder'
                  : reminderAt <= now
                    ? 'This time has passed. Choose a new reminder time.'
                    : taskReminderLabel(reminderAt, now)
              }
              disabled={disabled}
              onClick={() => setPicker((open) => !open)}
            >
              <CalendarClock size={16} />
              {reminderAt !== null && (
                <span className="task-schedule-label">
                  {taskReminderLabel(reminderAt, now)}
                </span>
              )}
            </button>
            {reminderAt !== null && (
              <button
                type="button"
                className="icon-button task-clear-reminder"
                aria-label="Remove reminder"
                title="Remove reminder"
                disabled={disabled}
                onClick={() => setReminderAt(null)}
              >
                <X size={13} />
              </button>
            )}
          </div>
          <button
            type="submit"
            className="button primary task-add"
            aria-label="Add task"
            disabled={disabled || !valid}
          >
            <Plus size={17} />
            <span>Add</span>
          </button>
        </div>
      </form>
      {picker && (
        <TaskReminderPicker
          value={reminderAt}
          now={now}
          onSet={(at) => {
            setReminderAt(at)
            setPicker(false)
          }}
          onClose={() => setPicker(false)}
        />
      )}
      {reminderTask && (
        <TaskReminderPicker
          value={reminderTask.reminderAt}
          now={now}
          onSet={(at) => {
            if (!disabled)
              dispatch({
                type: 'task-edit',
                id: reminderTask.id,
                title: reminderTask.title,
                reminderAt: at,
              })
            setReminding(null)
          }}
          onClose={() => setReminding(null)}
        />
      )}
      {editingTask && (
        <EditTask
          key={editingTask.id}
          task={editingTask}
          now={now}
          disabled={disabled}
          dispatch={dispatch}
          onClose={() => setEditing(null)}
        />
      )}
    </section>
  )
}

export function TaskReminders({
  tasks,
  disabled,
  dispatch,
}: {
  tasks: Task[]
  disabled: boolean
  dispatch: (action: Action) => void
}) {
  const due = tasks.filter(
    (t) => t.completedAt === null && t.reminderStatus === 'due',
  )
  if (!due.length) return null
  return (
    <section className="task-reminders" aria-label="Task reminders">
      <div className="task-reminders-heading" role="status">
        <Bell size={17} />
        <h2>
          {due.length === 1
            ? 'A little nudge'
            : `${due.length} reminders to come back to`}
        </h2>
        <span className="sr-only">
          {due.map((task) => task.title).join(', ')}
        </span>
      </div>
      <ul>
        {due.map((task) => (
          <li key={task.id}>
            <strong>{task.title}</strong>
            <div className="task-reminder-actions">
              <button
                disabled={disabled}
                onClick={() => dispatch({ type: 'task-toggle', id: task.id })}
              >
                <Check size={14} />
                Complete
              </button>
              <button
                disabled={disabled}
                onClick={() => dispatch({ type: 'task-snooze', id: task.id })}
              >
                Snooze 10 min
              </button>
              <button
                disabled={disabled}
                onClick={() => dispatch({ type: 'task-dismiss', id: task.id })}
              >
                Dismiss
              </button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
