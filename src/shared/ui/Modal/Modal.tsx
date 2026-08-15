import { useEffect, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/shared/lib/cn'

interface ModalProps {
  open: boolean
  onClose: () => void
  /** id of the heading element for aria-labelledby. */
  labelledBy?: string
  children: ReactNode
  className?: string
}

/** Everything inside the dialog that can hold focus, in document order. */
const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Modal — a centred dialog in a portal with a dimmed backdrop. Closes on Escape and
 * backdrop click; locks body scroll while open. Focus moves into the dialog on open, is
 * trapped inside it with Tab/Shift+Tab, and returns to whatever opened it on close — so a
 * keyboard or screen-reader user is never left tabbing around the page behind the overlay.
 * The card animates in with `card-in`; RTL-safe. Callers own the content (header, body, actions).
 */
export function Modal({ open, onClose, labelledBy, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    // Remember what had focus so it can be handed back when the dialog closes.
    const opener = document.activeElement as HTMLElement | null

    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    // Prefer the first real control; fall back to the dialog itself so focus is never left outside.
    ;(focusable()[0] ?? dialog)?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusable()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      // Wrap at both ends — and pull focus back in if it has escaped the dialog entirely.
      if (e.shiftKey && (active === first || !dialog?.contains(active))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
      opener?.focus?.()
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={onClose} />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={cn(
          // 560px is the design's standard dialog width — off Tailwind's stock scale (md 448 /
          // lg 512 / xl 576), so it is stated explicitly rather than rounded to a step.
          'relative w-full max-w-[560px] rounded-2xl bg-bg-surface p-6 shadow-xl outline-none motion-safe:animate-card-in',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
