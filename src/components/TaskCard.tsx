import { useEffect, useRef, useState, type FormEvent } from 'react'
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
  notify,
}: {
  task: Task
  now: number
  disabled: boolean
  dispatch: (action: Action) => void
  onEdit: (reminder?: boolean) => void
  notify: (text: string) => void
}) {
  const menu = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    const close = (event: PointerEvent) => {
      if (menu.current && !menu.current.contains(event.target as Node))
        menu.current.open = false
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && menu.current?.open) {
        menu.current.open = false
        menu.current.querySelector('summary')?.focus()
      }
    }
    document.addEventListener('pointerdown', close)
    document.addEventListener('keydown', escape)
    return () => {
      document.removeEventListener('pointerdown', close)
      document.removeEventListener('keydown', escape)
    }
  }, [])
  return (
    <li
      className={`task-row ${task.completedAt !== null ? 'is-complete' : ''}`}
    >
      <button
        className="task-check"
        role="checkbox"
        aria-checked={task.completedAt !== null}
        aria-label={`${task.completedAt === null ? 'Complete' : 'Reopen'} ${task.title}`}
        disabled={disabled}
        onClick={() => dispatch({ type: 'task-toggle', id: task.id })}
      >
        <span>{task.completedAt !== null && <Check size={14} />}</span>
      </button>
      <div className="task-row-copy">
        <span className="task-title">{task.title}</span>
        {task.reminderAt !== null && task.completedAt === null && (
          <span
            className={`task-time ${task.reminderStatus === 'due' ? 'is-due' : ''}`}
          >
            <Bell size={12} />
            {task.reminderStatus === 'due'
              ? 'Reminder due · '
              : task.reminderStatus === 'dismissed'
                ? 'Reminder off · '
                : ''}
            {taskReminderLabel(task.reminderAt, now)}
          </span>
        )}
      </div>
      <details className="task-row-menu" ref={menu}>
        <summary aria-label={`Actions for ${task.title}`}>
          <MoreHorizontal size={18} />
        </summary>
        <div className="task-menu-panel">
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              if (menu.current) {
                menu.current.open = false
                menu.current.querySelector('summary')?.focus()
              }
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
                if (menu.current) {
                  menu.current.open = false
                  menu.current.querySelector('summary')?.focus()
                }
                onEdit(true)
              }}
            >
              <CalendarClock size={14} />
              {task.reminderAt === null ? 'Add reminder' : 'Change reminder'}
            </button>
          )}
          <button
            type="button"
            disabled={disabled}
            onClick={() => {
              dispatch({ type: 'task-delete', id: task.id })
              notify('Task deleted.')
            }}
          >
            <Trash2 size={14} />
            Delete
          </button>
        </div>
      </details>
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
            onClick={() => setPicker(true)}
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
  const pending = tasks
    .filter((t) => t.completedAt === null)
    .sort(
      (a, b) =>
        (a.reminderStatus === 'dismissed'
          ? Infinity
          : (a.reminderAt ?? Infinity)) -
          (b.reminderStatus === 'dismissed'
            ? Infinity
            : (b.reminderAt ?? Infinity)) || a.createdAt - b.createdAt,
    )
  const completed = tasks
    .filter((t) => t.completedAt !== null)
    .sort((a, b) => b.completedAt! - a.completedAt!)
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
      <div className="task-body">
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
      </div>
      {completed.length > 0 && (
        <details className="tasks-completed">
          <summary>
            <ChevronDown size={14} />
            Completed <span>{completed.length}</span>
          </summary>
          <ul className="task-list">{completed.map(row)}</ul>
        </details>
      )}
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
          <button
            type="button"
            className={`icon-button task-schedule ${reminderAt !== null ? 'has-reminder' : ''}`}
            aria-label="Add task reminder"
            title="Add reminder"
            disabled={disabled}
            onClick={() => setPicker(true)}
          >
            <CalendarClock size={18} />
          </button>
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
        {reminderAt !== null && (
          <div className="task-composer-meta">
            <ReminderChip
              at={reminderAt}
              now={now}
              onRemove={() => setReminderAt(null)}
            />
            {reminderAt <= now && (
              <span className="task-time is-due">
                Choose a future time to add this task.
              </span>
            )}
          </div>
        )}
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
