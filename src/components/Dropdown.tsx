import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'

interface Option {
  value: string
  label: string
}

/** A styled, keyboard-accessible selector. Its panel stays inside an open
 * dialog's focus scope, but outside any scrolling field container. */
export function Dropdown({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: {
  label: string
  value: string
  options: Option[]
  onChange: (value: string) => void
  disabled?: boolean
}) {
  const id = useId()
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const selected = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  )
  const [active, setActive] = useState(selected)
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    minWidth: 88,
    maxHeight: 224,
  })
  const search = useRef({ text: '', at: 0 })
  const close = () => {
    setOpen(false)
    trigger.current?.focus()
  }
  const choose = (index: number) => {
    onChange(options[index].value)
    close()
  }
  const show = () => {
    setActive(selected)
    setOpen(true)
  }
  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      if (!trigger.current || !panel.current) return
      const anchor = trigger.current.getBoundingClientRect()
      const below = innerHeight - anchor.bottom - 12
      const above = anchor.top - 12
      const upwards =
        below < Math.min(224, panel.current.scrollHeight) && above > below
      const maxHeight = Math.max(64, Math.min(224, upwards ? above : below))
      const height = Math.min(panel.current.scrollHeight, maxHeight)
      setPosition({
        top: upwards ? anchor.top - height - 5 : anchor.bottom + 5,
        left: Math.max(
          8,
          Math.min(
            anchor.left,
            document.documentElement.clientWidth -
              Math.max(anchor.width, 88) -
              8,
          ),
        ),
        minWidth: Math.max(88, anchor.width),
        maxHeight,
      })
    }
    place()
    panel.current?.focus({ preventScroll: true })
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])
  useLayoutEffect(() => {
    if (open)
      panel.current
        ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
        ?.scrollIntoView?.({ block: 'nearest' })
  }, [active, open])
  useEffect(() => {
    if (!open) return
    const outside = (event: Event) => {
      if (
        !panel.current?.contains(event.target as Node) &&
        !trigger.current?.contains(event.target as Node)
      )
        setOpen(false)
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('focusin', outside)
    return () => {
      document.removeEventListener('pointerdown', outside)
      document.removeEventListener('focusin', outside)
    }
  }, [open])
  const keyDown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      close()
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      choose(active)
      return
    }
    if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      setActive((index) =>
        event.key === 'Home'
          ? 0
          : event.key === 'End'
            ? options.length - 1
            : (index + (event.key === 'ArrowDown' ? 1 : -1) + options.length) %
              options.length,
      )
      return
    }
    if (
      event.key.length === 1 &&
      !event.ctrlKey &&
      !event.metaKey &&
      !event.altKey
    ) {
      event.preventDefault()
      const text =
        (Date.now() - search.current.at < 700 ? search.current.text : '') +
        event.key.toLowerCase()
      search.current = { text, at: Date.now() }
      const index = options.findIndex((option) =>
        option.label.toLowerCase().startsWith(text),
      )
      if (index >= 0) setActive(index)
    }
  }
  return (
    <>
      <button
        type="button"
        ref={trigger}
        className="dropdown-trigger"
        role="combobox"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? id : undefined}
        disabled={disabled}
        onClick={() => (open ? close() : show())}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            show()
          }
        }}
      >
        <span>{options[selected]?.label}</span>
        <ChevronDown size={13} />
      </button>
      {open &&
        createPortal(
          <div
            ref={panel}
            id={id}
            className="dropdown-panel"
            style={position}
            role="listbox"
            aria-label={label}
            tabIndex={-1}
            aria-activedescendant={`${id}-${active}`}
            onKeyDown={keyDown}
          >
            {options.map((option, index) => (
              <button
                type="button"
                role="option"
                id={`${id}-${index}`}
                data-index={index}
                key={option.value}
                tabIndex={-1}
                aria-selected={option.value === value}
                className={index === active ? 'is-active' : ''}
                onPointerMove={() => setActive(index)}
                onClick={() => choose(index)}
              >
                <span>{option.label}</span>
                {option.value === value && <Check size={13} />}
              </button>
            ))}
          </div>,
          trigger.current?.closest('dialog') ?? document.body,
        )}
    </>
  )
}
