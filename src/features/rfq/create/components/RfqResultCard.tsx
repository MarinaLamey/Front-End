import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { cn } from '@/shared/lib/cn'
import { CheckIcon } from './icons'
import type { RfqOutcome, RfqResult } from '../../types'

type ActionKey = 'backToDashboard' | 'continueEditing' | 'viewRfq' | 'trackBids' | 'verifyOrg'
type StatusTone = 'neutral' | 'success' | 'warning'

interface OutcomeConfig {
  statusKey: string
  statusTone: StatusTone
  primary: ActionKey
  secondary: ActionKey
}

const CONFIG: Record<RfqOutcome, OutcomeConfig> = {
  draft_saved: { statusKey: 'draft', statusTone: 'neutral', primary: 'continueEditing', secondary: 'backToDashboard' },
  published: { statusKey: 'live', statusTone: 'success', primary: 'viewRfq', secondary: 'trackBids' },
  verify_to_publish: { statusKey: 'awaitingVerification', statusTone: 'warning', primary: 'verifyOrg', secondary: 'backToDashboard' },
}

const STATUS_TONE: Record<StatusTone, string> = {
  neutral: 'text-content-primary',
  success: 'text-status-success-strong',
  warning: 'text-status-warning-strong',
}

interface RfqResultCardProps {
  result: RfqResult
  onAction: (action: ActionKey) => void
}

/** The centred terminal card shown after Save/Submit — one component, four outcomes. */
export function RfqResultCard({ result, onAction }: RfqResultCardProps) {
  const { t, i18n } = useTranslation()
  const config = CONFIG[result.outcome]

  const closing = result.closingDate
    ? new Intl.DateTimeFormat(i18n.language, {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(new Date(result.closingDate))
    : '—'

  const rows: { label: string; value: string; tone?: string }[] = [
    { label: t('rfq.create.result.reference'), value: result.reference },
    { label: t('rfq.create.result.status'), value: t(`rfq.create.result.statuses.${config.statusKey}`), tone: STATUS_TONE[config.statusTone] },
    { label: t('rfq.create.result.category'), value: result.category || '—' },
    { label: t('rfq.create.result.closing'), value: closing },
    { label: t('rfq.create.result.audience'), value: t('rfq.create.result.matched', { count: result.matchedSuppliers }) },
  ]

  return (
    <div className="mx-auto w-full max-w-[560px] rounded-2xl border border-border-subtle bg-bg-surface p-8 text-center shadow-sm motion-safe:animate-card-in">
      {/* `hero-sheen` (existing primitive) plays once the check-pop spring settles — a quiet
          celebratory glint, not a loop. */}
      <div className="relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-status-success-subtle text-status-success-strong shadow-sm motion-safe:animate-check-pop">
        <CheckIcon className="h-6 w-6" />
        <span aria-hidden="true" className="hero-sheen pointer-events-none absolute inset-0" style={{ animationDelay: '350ms' }} />
      </div>

      <h2 className="mt-5 text-xl font-bold text-content-primary">
        {t(`rfq.create.result.${result.outcome}.title`)}
      </h2>
      <p className="mx-auto mt-2 max-w-sm text-sm text-content-secondary">
        {t(`rfq.create.result.${result.outcome}.body`)}
      </p>

      <dl className="mt-6 space-y-2.5 rounded-xl bg-bg-surface-sunken p-4 text-sm">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between gap-3">
            <dt className="text-content-tertiary">{row.label}</dt>
            <dd className={cn('font-semibold', row.tone ?? 'text-content-primary')}>{row.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-6 flex items-center justify-center gap-3">
        <Button variant="outline" onClick={() => onAction(config.secondary)}>
          {t(`rfq.create.result.actions.${config.secondary}`)}
        </Button>
        <Button variant="primary" onClick={() => onAction(config.primary)}>
          {t(`rfq.create.result.actions.${config.primary}`)}
        </Button>
      </div>
    </div>
  )
}
