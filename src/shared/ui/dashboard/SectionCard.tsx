import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

interface SectionCardProps {
  /** Heading text. Omit for a plain padded card. */
  title?: ReactNode
  /** Small icon before the title. */
  titleIcon?: ReactNode
  /** Right-aligned action in the header (a link or button). */
  action?: ReactNode
  /** Remove the body padding (e.g. for a full-bleed list). */
  flush?: boolean
  className?: string
  children: ReactNode
}

/**
 * SectionCard — the bordered surface card used across the dashboard (My RFQs, Action Required,
 * AI recommendations, Compliance, Track order…). Provides the consistent header (icon + title +
 * trailing action) and body. Presentational; callers fill the body with the relevant content.
 */
export function SectionCard({ title, titleIcon, action, flush = false, className, children }: SectionCardProps) {
  return (
    <section className={cn('rounded-xl border border-border-subtle bg-bg-surface', className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-4 px-5 pt-5">
          <h2 className="flex items-center gap-2 text-base font-semibold text-content-primary">
            {titleIcon}
            {title}
          </h2>
          {action}
        </header>
      )}
      <div className={cn(flush ? '' : 'p-5', title && !flush && 'pt-4')}>{children}</div>
    </section>
  )
}
