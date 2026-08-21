import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { SectionCard, StatusBadge, ClockIcon, CheckCircleIcon, XCircleIcon, type BadgeTone } from '@/shared/ui/dashboard'
import type { VerificationStatus } from '@/platform/verification'

type ItemState = 'verifying' | 'verified' | 'rejected'

interface DocRow {
  title: string
  meta: string
  state: ItemState
  /** Red reason under the meta (rejected only). */
  reason?: string
  action?: ReactNode
}

const STATE_ICON: Record<ItemState, { icon: typeof ClockIcon; tone: string }> = {
  verifying: { icon: ClockIcon, tone: 'text-status-warning-strong' },
  verified: { icon: CheckCircleIcon, tone: 'text-status-success-strong' },
  rejected: { icon: XCircleIcon, tone: 'text-status-danger-strong' },
}

/** i18n keys under `dashboard.status` — the label is the admin's decision on this document. */
const STATE_BADGE: Record<ItemState, string> = {
  verifying: 'dashboard.status.verifying',
  verified: 'dashboard.status.verified',
  rejected: 'dashboard.status.rejected',
}

/** Forced explicitly: StatusBadge can only infer a tone from an English label, and ours is localised. */
const STATE_TONE: Record<ItemState, BadgeTone> = {
  verifying: 'warning',
  verified: 'success',
  rejected: 'danger',
}

interface VerificationStatusCardProps {
  status: Exclude<VerificationStatus, 'verified'>
  items: DocRow[]
  /** Footer note under the rows. */
  note: string
}

/**
 * VerificationStatusCard — the per-document review panel shown on the pending & rejected buyer
 * dashboards: each of CR / VAT with a state icon, number, and a status pill (plus a red reason
 * and Re-upload action when an item is rejected).
 */
export function VerificationStatusCard({ items, note }: VerificationStatusCardProps) {
  const { t } = useTranslation()
  return (
    <SectionCard title={t('dashboard.verification.statusTitle')}>
      <ul className="flex flex-col divide-y divide-border-subtle motion-safe:animate-page-in">
        {items.map((item) => {
          const { icon: Icon, tone } = STATE_ICON[item.state]
          return (
            // `flex-wrap`: the badge+"Re-upload" cluster is `shrink-0` by design, so a rejected row
            // (pill + button together) drops it to its own row on a narrow screen instead of
            // overflowing the card.
            <li key={item.title} className="flex flex-wrap items-start gap-3 py-3 first:pt-0 last:pb-0">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 stroke-2 ${tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content-primary">{item.title}</p>
                {/* A rejected row carries its whole meta line in danger red, as in the Figma. */}
                <p className={cn('mt-0.5 text-xs', item.state === 'rejected' ? 'text-status-danger' : 'text-content-tertiary')}>
                  {item.meta}
                </p>
                {item.reason && <p className="mt-0.5 text-xs font-medium text-status-danger">{item.reason}</p>}
              </div>
              <div className="flex w-full shrink-0 items-center justify-end gap-2 sm:w-auto">
                <StatusBadge label={t(STATE_BADGE[item.state])} tone={STATE_TONE[item.state]} dot={false} strong plain />
                {item.action}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="mt-3 border-t border-border-subtle pt-3 text-xs text-content-tertiary">{note}</p>
    </SectionCard>
  )
}
