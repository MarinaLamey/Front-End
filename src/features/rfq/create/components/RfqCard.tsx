import type { ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface RfqCardProps {
  title?: string
  /** Right-aligned slot in the header — a pill, badge or link. */
  action?: ReactNode
  children: ReactNode
  className?: string
}

/** RfqCard — the white section container used throughout the wizard (title + optional action). */
export function RfqCard({ title, action, children, className }: RfqCardProps) {
  return (
    <section
      className={cn(
        'rounded-xl border border-border-subtle bg-bg-surface p-5 shadow-sm sm:p-6',
        className,
      )}
    >
      {(title || action) && (
        <header className="mb-4 flex items-center justify-between gap-3">
          {title && <h2 className="text-base font-semibold text-content-primary">{title}</h2>}
          {action}
        </header>
      )}
      {children}
    </section>
  )
}

/** A small labelled sub-group inside a card (e.g. "Scope of work"). */
export function RfqField({
  label,
  children,
  className,
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="text-sm font-medium text-content-secondary">{label}</span>
      {children}
    </div>
  )
}
