import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/** Tint of the leading icon tile. */
export type RowTone = 'brand' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

const TILE_TONE: Record<RowTone, string> = {
  brand: 'bg-brand-subtle text-brand-primary',
  success: 'bg-status-success-subtle text-status-success',
  warning: 'bg-status-warning-subtle text-status-warning',
  danger: 'bg-status-danger-subtle text-status-danger',
  info: 'bg-status-info-subtle text-status-info',
  neutral: 'bg-bg-surface-sunken text-content-secondary',
}

interface ListRowProps {
  /** Leading icon, wrapped in a tinted tile. */
  icon?: ReactNode
  iconTone?: RowTone
  title: ReactNode
  /** Meta line under the title (can hold inline badges). */
  subtitle?: ReactNode
  /** Right-aligned content (amount + badge, a button, a chip, an unread dot…). */
  trailing?: ReactNode
  /** Make the whole row interactive. */
  onClick?: () => void
  className?: string
}

/**
 * ListRow — the reusable row used by every list on the dashboard (My RFQs, Action Required,
 * AI recommendations, Compliance documents, Notifications). Leading tinted-tile icon, a
 * title + meta stack, and a trailing slot. When `onClick` is set the row becomes a button with
 * a hover surface. Compose rows inside a `divide-y divide-border-subtle` container.
 */
export function ListRow({ icon, iconTone = 'neutral', title, subtitle, trailing, onClick, className }: ListRowProps) {
  const content = (
    <>
      {icon != null && (
        <span
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg shadow-sm [&>svg]:h-5 [&>svg]:w-5',
            TILE_TONE[iconTone],
          )}
        >
          {icon}
        </span>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-content-primary">{title}</span>
        {subtitle != null && <span className="mt-0.5 flex items-center gap-1.5 text-xs text-content-tertiary">{subtitle}</span>}
      </div>
      {trailing != null && <div className="flex shrink-0 flex-col items-end gap-1 text-end">{trailing}</div>}
    </>
  )

  const base = 'flex w-full items-center gap-3 py-3 text-start'
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={cn(base, '-mx-2 rounded-lg px-2 transition-colors hover:bg-interactive-hover', className)}>
        {content}
      </button>
    )
  }
  return <div className={cn(base, className)}>{content}</div>
}
