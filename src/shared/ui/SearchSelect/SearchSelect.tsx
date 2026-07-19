import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/cn'
import type { UiError } from '@/shared/ui/types'

interface SearchSelectProps {
  label: string
  required?: boolean
  options: string[]
  value: string
  onChange: (value: string) => void
  /** Trigger text when nothing is selected. */
  placeholder?: string
  /** Placeholder inside the search box. */
  searchPlaceholder?: string
  /** Shown when the query matches no option. */
  emptyLabel?: string
  error?: UiError | null
  success?: boolean
}

interface PanelRect {
  top: number
  left: number
  width: number
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.667} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="9" cy="9" r="6" />
      <path d="m17 17-3.5-3.5" />
    </svg>
  )
}

function Chevron({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.667} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m5 7.5 5 5 5-5" />
    </svg>
  )
}

function CheckMark({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M13.333 4 6 11.333 2.667 8" />
    </svg>
  )
}

/**
 * SearchSelect — a labelled, searchable single-select (combobox). The trigger looks like a
 * Field; opening it drops a floating panel with a search box and a filtered option list. The
 * highlighted row (hover or keyboard) grows a leading accent bar and nudges its label; the
 * selected row is brand-tinted with a popped-in check. Options cascade in on open.
 *
 * The panel is rendered in a PORTAL to document.body and positioned against the trigger, so it
 * floats ABOVE everything and is never clipped by an ancestor's overflow (e.g. the card's
 * rounded-corner clip). It re-measures on scroll / resize. RTL-safe; keyboard: ↑/↓ move, Enter
 * selects, Esc closes.
 */
export function SearchSelect({
  label,
  required = false,
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder,
  emptyLabel = 'No results',
  error = null,
  success = false,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)
  const [rect, setRect] = useState<PanelRect | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options
  }, [options, query])

  // Position the portal panel under the trigger in DOCUMENT coords (position: absolute), so the
  // panel adds to the page's scrollable height — the screen can scroll to reveal a dropdown that
  // opens near the bottom, instead of it being pinned to the viewport.
  const measure = () => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    setRect({ top: r.bottom + window.scrollY + 4, left: r.left + window.scrollX, width: r.width })
  }

  useLayoutEffect(() => {
    if (open) measure()
  }, [open])

  // Re-measure on resize (layout shifts the trigger); close on outside click / Escape. No scroll
  // listener needed — document-anchored coords keep the panel aligned as the page scrolls.
  useEffect(() => {
    if (!open) return
    const onResize = () => measure()
    const onDocMouseDown = (event: MouseEvent) => {
      const target = event.target as Node
      if (triggerRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('resize', onResize)
    document.addEventListener('mousedown', onDocMouseDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('resize', onResize)
      document.removeEventListener('mousedown', onDocMouseDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  // Opening → start the highlight on the current selection (or the top of the list).
  const openPanel = () => {
    const index = filtered.indexOf(value)
    setActive(index >= 0 ? index : 0)
    setQuery('')
    setOpen(true)
  }

  const choose = (option: string) => {
    onChange(option)
    setOpen(false)
    setQuery('')
  }

  const onSearchKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      setActive((i) => Math.min(i + 1, filtered.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive((i) => Math.max(i - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (filtered[active]) choose(filtered[active])
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-medium text-content-primary">
        {label}
        {required && <span className="ms-0.5 text-status-danger">*</span>}
      </span>

      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openPanel())}
        className={cn(
          'flex h-10 w-full items-center gap-2 rounded-lg bg-bg-surface px-3 text-start outline outline-1 [outline-offset:-1px] transition-colors',
          success
            ? 'outline-status-success'
            : error
              ? 'outline-border-danger'
              : 'outline-border-default hover:outline-border-focus',
          open && !error && !success && 'outline-2 [outline-offset:-2px] outline-border-focus',
        )}
      >
        <span className={cn('flex-1 truncate text-sm', value ? 'text-content-primary' : 'text-content-tertiary')}>
          {value || placeholder}
        </span>
        <Chevron className={cn('h-5 w-5 shrink-0 text-content-tertiary transition-transform duration-200', open && 'rotate-180')} />
      </button>

      {open &&
        rect &&
        createPortal(
          <div
            ref={panelRef}
            style={{ position: 'absolute', top: rect.top, left: rect.left, width: rect.width }}
            className="z-[100] origin-top rounded-xl border border-border-subtle bg-bg-surface p-1 shadow-xl motion-safe:animate-card-in"
          >
            <div className="flex items-center gap-2 rounded-lg bg-bg-surface-sunken px-2.5 py-2">
              <SearchIcon className="h-4 w-4 shrink-0 text-content-tertiary" />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={(event) => {
                  setQuery(event.target.value)
                  setActive(0)
                }}
                onKeyDown={onSearchKeyDown}
                placeholder={searchPlaceholder}
                className="w-full bg-transparent text-sm text-content-primary outline-none placeholder:text-content-tertiary"
              />
            </div>

            <ul role="listbox" className="mt-1 max-h-60 overflow-auto">
              {filtered.length === 0 ? (
                <li className="px-3 py-6 text-center text-sm text-content-tertiary">{emptyLabel}</li>
              ) : (
                filtered.map((option, i) => {
                  const selected = option === value
                  const highlighted = i === active
                  return (
                    <li key={option} style={{ animationDelay: `${i * 28}ms` }} className="motion-safe:animate-stepper-in">
                      <button
                        type="button"
                        role="option"
                        aria-selected={selected}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(option)}
                        className={cn(
                          'relative flex w-full items-center justify-between gap-2 overflow-hidden rounded-lg px-3 py-2 text-start text-sm transition-colors duration-150',
                          highlighted ? 'bg-interactive-hover' : 'bg-transparent',
                          selected ? 'font-medium text-brand-strong' : 'text-content-primary',
                        )}
                      >
                        {/* Leading accent bar — grows in when the row is highlighted or selected. */}
                        <span
                          aria-hidden="true"
                          className={cn(
                            'absolute inset-y-1.5 start-0 w-[3px] origin-center rounded-full bg-brand-primary transition-transform duration-200 ease-out',
                            highlighted || selected ? 'scale-y-100' : 'scale-y-0',
                          )}
                        />
                        <span
                          className={cn(
                            'transition-transform duration-200 ease-out',
                            highlighted && 'translate-x-1.5 rtl:-translate-x-1.5',
                          )}
                        >
                          {option}
                        </span>
                        {selected && <CheckMark className="h-4 w-4 shrink-0 text-brand-primary motion-safe:animate-check-pop" />}
                      </button>
                    </li>
                  )
                })
              )}
            </ul>
          </div>,
          document.body,
        )}

      {error && <p className="text-sm text-status-danger">{error.title}</p>}
    </div>
  )
}
