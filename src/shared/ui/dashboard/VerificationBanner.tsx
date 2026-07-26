import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { StatusBadge } from './StatusBadge'
import { CheckCircleIcon, ClockIcon, AlertTriangleIcon } from './icons'

export type VerificationState = 'pending' | 'verified' | 'rejected'

const CONFIG: Record<VerificationState, { tone: string; icon: typeof ClockIcon }> = {
  pending: { tone: 'border-status-warning-border bg-status-warning-subtle text-status-warning-strong', icon: ClockIcon },
  verified: { tone: 'border-status-success-border bg-status-success-subtle text-status-success-strong', icon: CheckCircleIcon },
  rejected: { tone: 'border-status-danger-border bg-status-danger-subtle text-status-danger-strong', icon: AlertTriangleIcon },
}

interface VerificationBannerProps {
  state: VerificationState
  title: string
  message: ReactNode
  /** Pill label on the right (defaults to the capitalised state). */
  badgeLabel: string
}

/**
 * VerificationBanner — the top strip that tells the org where its KYB review stands:
 * amber "in review" (pending), red "could not complete" + reason (rejected), or green "verified".
 * The icon + colour come from the state; the copy is passed in so it can be localised.
 */
export function VerificationBanner({ state, title, message, badgeLabel }: VerificationBannerProps) {
  const { tone, icon: Icon } = CONFIG[state]
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-4', tone)}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0 stroke-2" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-content-primary">{title}</p>
        <p className="mt-0.5 text-sm text-content-secondary">{message}</p>
      </div>
      <StatusBadge label={badgeLabel} dot={false} strong />
    </div>
  )
}
