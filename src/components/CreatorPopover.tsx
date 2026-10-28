import { useLayoutEffect, useRef, useState } from 'react'
import { ArrowUpRight, ChevronUp, Globe } from 'lucide-react'

function Linkedin({ size = 19 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M20.45 2H3.55C2.7 2 2 2.68 2 3.52v16.96c0 .84.7 1.52 1.55 1.52h16.9c.86 0 1.55-.68 1.55-1.52V3.52c0-.84-.69-1.52-1.55-1.52ZM7.93 18.75H4.98V9.2h2.95v9.55ZM6.45 7.9a1.71 1.71 0 1 1 0-3.42 1.71 1.71 0 0 1 0 3.42Zm12.3 10.85H15.8V14.1c0-1.1-.02-2.52-1.54-2.52-1.54 0-1.78 1.2-1.78 2.44v4.73H9.53V9.2h2.83v1.3h.04c.4-.75 1.36-1.54 2.8-1.54 3 0 3.55 1.98 3.55 4.55v5.24Z" />
    </svg>
  )
}

function Github({ size = 19 }: { size?: number; strokeWidth?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 .9a11.1 11.1 0 0 0-3.51 21.63c.55.1.76-.24.76-.54v-2.06c-3.09.67-3.74-1.31-3.74-1.31-.5-1.28-1.23-1.62-1.23-1.62-1.01-.69.08-.68.08-.68 1.12.08 1.7 1.15 1.7 1.15.99 1.69 2.6 1.2 3.23.92.1-.72.39-1.2.7-1.48-2.47-.28-5.07-1.24-5.07-5.49 0-1.21.43-2.2 1.14-2.98-.11-.28-.49-1.41.11-2.94 0 0 .93-.3 3.05 1.14a10.6 10.6 0 0 1 5.56 0c2.12-1.44 3.05-1.14 3.05-1.14.6 1.53.22 2.66.11 2.94.71.78 1.14 1.77 1.14 2.98 0 4.26-2.6 5.21-5.08 5.49.4.34.75 1.02.75 2.06v3.02c0 .3.2.65.77.54A11.1 11.1 0 0 0 12 .9Z" />
    </svg>
  )
}

const links = [
  {
    label: 'Portfolio',
    description: 'rashinkp.vercel.app',
    href: 'https://rashinkp.vercel.app/',
    icon: Globe,
  },
  {
    label: 'LinkedIn',
    description: 'Let’s connect',
    href: 'https://www.linkedin.com/in/rashinkp',
    icon: Linkedin,
  },
  {
    label: 'GitHub',
    description: 'Projects & code',
    href: 'https://github.com/rashinkp',
    icon: Github,
  },
]

export function CreatorPopover() {
  const trigger = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })

  useLayoutEffect(() => {
    if (!open) return
    const place = () => {
      if (!trigger.current || !panel.current) return
      const anchor = trigger.current.getBoundingClientRect()
      const box = panel.current.getBoundingClientRect()
      const above = anchor.top - box.height - 10
      setPosition({
        top: Math.max(
          12,
          above >= 12
            ? above
            : Math.min(
                anchor.bottom + 10,
                window.innerHeight - box.height - 12,
              ),
        ),
        left: Math.max(
          12,
          Math.min(
            anchor.left,
            document.documentElement.clientWidth - box.width - 12,
          ),
        ),
      })
    }
    place()
    window.addEventListener('resize', place)
    window.addEventListener('scroll', place, true)
    return () => {
      window.removeEventListener('resize', place)
      window.removeEventListener('scroll', place, true)
    }
  }, [open])

  return (
    <div className="footer-credit">
      <span>Made by</span>
      <button
        ref={trigger}
        className="creator-trigger"
        popoverTarget="creator-links"
        aria-expanded={open}
        aria-controls="creator-links"
      >
        Rashin <ChevronUp size={12} aria-hidden="true" />
      </button>
      <div
        ref={panel}
        id="creator-links"
        className="creator-popover"
        popover="auto"
        style={position}
        onToggle={(event) => setOpen(event.newState === 'open')}
      >
        <div className="creator-heading">
          <strong>Rashin</strong>
          <span>Find me online</span>
        </div>
        <nav aria-label="Rashin’s links">
          {links.map(({ label, description, href, icon: Icon }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (opens in a new tab)`}
              onClick={() => panel.current?.hidePopover()}
            >
              <span className="creator-link-icon">
                <Icon size={19} strokeWidth={1.6} />
              </span>
              <span className="creator-link-copy">
                <strong>{label}</strong>
                <span>{description}</span>
              </span>
              <ArrowUpRight
                size={15}
                className="creator-link-arrow"
                aria-hidden="true"
              />
            </a>
          ))}
        </nav>
      </div>
    </div>
  )
}
