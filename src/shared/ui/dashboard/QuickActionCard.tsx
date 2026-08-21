import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/** Icon tile tint for a quick action. */
type Accent = 'brand' | 'success' | 'info' | 'danger'

const ACCENT: Record<Accent, string> = {
  brand: 'bg-brand-subtle text-brand-primary',
  success: 'bg-status-success-subtle text-status-success',
  info: 'bg-status-info-subtle text-status-info',
  danger: 'bg-status-danger-subtle text-status-danger',
}

interface QuickActionCardProps {
  icon: ReactNode
  label: string
  accent?: Accent
  onClick?: () => void
  /** Locked (pre-verified): greyed and non-interactive. */
  locked?: boolean
}

/**
 * QuickActionCard — one tile in the Quick Actions grid (Create RFQ, Compare Bids, Track Orders,
 * Raise Dispute…). An accent icon medallion over a label. When `locked` it greys out and stops
 * responding, for the pending/rejected dashboards. Hover lifts the border (transform-free).
 */
export function QuickActionCard({ icon, label, accent = 'brand', onClick, locked = false }: QuickActionCardProps) {
  return (
    <button
      type="button"
      onClick={locked ? undefined : onClick}
      disabled={locked}
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface p-6 transition-colors',
        // Locked stays deliberately flat (no lift/shadow) — it reads as inert, not clickable.
        locked ? 'cursor-not-allowed opacity-60' : 'mp-lift shadow-sm hover:border-border-focus hover:bg-interactive-hover',
      )}
    >
      <span
        className={cn(
          'flex h-12 w-12 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5',
          locked ? 'bg-bg-surface-sunken text-content-tertiary' : cn(ACCENT[accent], 'shadow-sm'),
        )}
      >
        {icon}
      </span>
      <span className="text-sm font-medium text-content-primary">{label}</span>
    </button>
  )
}
