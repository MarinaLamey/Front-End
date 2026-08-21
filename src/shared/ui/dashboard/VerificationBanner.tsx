import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { StatusBadge, type Tone as BadgeTone } from './StatusBadge'
import { CheckCircleIcon, ClockIcon, AlertTriangleIcon } from './icons'

export type VerificationState = 'pending' | 'verified' | 'rejected'

const CONFIG: Record<VerificationState, { tone: string; badge: BadgeTone; icon: typeof ClockIcon }> = {
  pending: {
    tone: 'border-status-warning-border bg-status-warning-subtle text-status-warning-strong',
    badge: 'warning',
    icon: ClockIcon,
  },
  verified: {
    tone: 'border-status-success-border bg-status-success-subtle text-status-success-strong',
    badge: 'success',
    icon: CheckCircleIcon,
  },
  rejected: {
    tone: 'border-status-danger-border bg-status-danger-subtle text-status-danger-strong',
    badge: 'danger',
    icon: AlertTriangleIcon,
  },
}

interface VerificationBannerProps {
  state: VerificationState
  title: string
  message: ReactNode
  /** Pill label on the right (defaults to the capitalised state). */
  badgeLabel: string
  /** Optional control beside the pill — the rejected banner carries "Resubmit documents". */
  action?: ReactNode
}

/**
 * VerificationBanner — the top strip that tells the org where its KYB review stands:
 * amber "in review" (pending), red "could not complete" + reason (rejected), or green "verified".
 * The icon + colour come from the state; the copy is passed in so it can be localised.
 */
export function VerificationBanner({ state, title, message, badgeLabel, action }: VerificationBannerProps) {
  const { tone, badge, icon: Icon } = CONFIG[state]
  return (
    // `flex-wrap`: the badge+action cluster is `shrink-0` by design (a squeezed pill/button reads
    // worse than one on its own line), so on a narrow screen — rejected state, with both the
    // pill AND a "Resubmit" button — it drops to its own row instead of overflowing.
    <div className={cn('flex flex-wrap items-start gap-3 rounded-xl border p-4', tone)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 stroke-2" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-content-primary">{title}</p>
        <p className="mt-0.5 text-sm text-content-secondary">{message}</p>
      </div>
      <div className="flex w-full shrink-0 items-center justify-end gap-3 sm:w-auto">
        {/* Tone comes from `state`, not the label — the label is localised and would not resolve. */}
        <StatusBadge label={badgeLabel} tone={badge} dot={false} strong plain />
        {action}
      </div>
    </div>
  )
}
