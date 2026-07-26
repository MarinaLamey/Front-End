import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { ArrowUpRightIcon } from './icons'

/** Accent colour of the icon tile — one per metric, matching the Figma. */
type Accent = 'brand' | 'success' | 'warning' | 'info' | 'secondary'

const ACCENT_TILE: Record<Accent, string> = {
  brand: 'bg-brand-primary text-brand-primary-on',
  success: 'bg-status-success text-white',
  warning: 'bg-status-warning text-white',
  info: 'bg-status-info text-white',
  secondary: 'bg-brand-secondary text-white',
}

interface Delta {
  /** e.g. "+3", "+4 pts", "-1.3 d", "5 new". */
  label: string
  /** Colour of the delta — good news vs. attention. */
  tone: 'positive' | 'attention'
}

interface StatCardProps {
  icon: ReactNode
  value: ReactNode
  label: string
  accent?: Accent
  delta?: Delta
  /** Locked/empty look (pending & rejected states): greyed tile, no delta. */
  muted?: boolean
}

/**
 * StatCard — a single KPI tile: an accent icon tile, an optional trend chip, the value, and its
 * label. Presentational only; the value is passed pre-formatted. In `muted` mode (used on the
 * pre-verified dashboards) the value greys out and the delta is hidden, but the accent icon box
 * keeps its colour. Entrance animation is applied by the parent grid, so the card itself is static.
 */
export function StatCard({ icon, value, label, accent = 'brand', delta, muted = false }: StatCardProps) {
  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-start justify-between">
        <span
          className={cn(
            'flex h-11 w-11 items-center justify-center rounded-xl [&>svg]:h-5 [&>svg]:w-5',
            ACCENT_TILE[accent],
            // Pending/rejected: keep the accent colour but fade it — the feature is locked.
            muted && 'opacity-50',
          )}
        >
          {icon}
        </span>
        {!muted && delta && (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 text-xs font-semibold',
              delta.tone === 'positive' ? 'text-status-success' : 'text-status-danger',
            )}
          >
            <ArrowUpRightIcon className="h-3.5 w-3.5" />
            {delta.label}
          </span>
        )}
      </div>
      <div>
        <p className={cn('text-3xl font-bold tracking-tight', muted ? 'text-content-tertiary' : 'text-content-primary')}>
          {value}
        </p>
        <p className="mt-1 text-sm text-content-tertiary">{label}</p>
      </div>
    </div>
  )
}
