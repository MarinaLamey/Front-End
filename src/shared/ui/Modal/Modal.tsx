import { useEffect, type ReactNode } from 'react'
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

/**
 * Modal — a centred dialog in a portal with a dimmed backdrop. Closes on Escape and
 * backdrop click; locks body scroll while open. The card animates in with `card-in`;
 * RTL-safe. Callers own the content (header, body, actions).
 */
export function Modal({ open, onClose, labelledBy, children, className }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = previous
    }
  }, [open, onClose])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" aria-hidden onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        className={cn(
          'relative w-full max-w-md rounded-2xl bg-bg-surface p-6 shadow-xl motion-safe:animate-card-in',
          className,
        )}
      >
        {children}
      </div>
    </div>,
    document.body,
  )
}
