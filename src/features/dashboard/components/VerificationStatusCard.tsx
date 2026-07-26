import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SectionCard, StatusBadge, ClockIcon, CheckCircleIcon, XCircleIcon } from '@/shared/ui/dashboard'
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

const STATE_BADGE: Record<ItemState, string> = {
  verifying: 'Verifying',
  verified: 'Verified',
  rejected: 'Rejected',
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
      <ul className="flex flex-col divide-y divide-border-subtle">
        {items.map((item) => {
          const { icon: Icon, tone } = STATE_ICON[item.state]
          return (
            <li key={item.title} className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
              <Icon className={`mt-0.5 h-5 w-5 shrink-0 stroke-2 ${tone}`} />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-content-primary">{item.title}</p>
                <p className="mt-0.5 text-xs text-content-tertiary">{item.meta}</p>
                {item.reason && <p className="mt-0.5 text-xs font-medium text-status-danger">{item.reason}</p>}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge label={STATE_BADGE[item.state]} dot={false} strong />
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
