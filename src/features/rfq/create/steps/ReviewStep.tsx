import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/Field'
import { Input } from '@/shared/ui/Input'
import { SearchSelect } from '@/shared/ui/SearchSelect'
import { Switch } from '@/shared/ui/Switch'
import { cn } from '@/shared/lib/cn'
import { RfqCard } from '../components/RfqCard'
import type { RfqStep } from '../rfqDraftStore'
import type { RfqDraft } from '../../types'

interface ReviewStepProps {
  draft: RfqDraft
  patch: (partial: Partial<RfqDraft>) => void
  /** Jump the wizard to another step to edit a field there (e.g. payment terms → step 2). */
  onEditStep?: (step: RfqStep) => void
}

/** A read-only summary value styled like a filled, non-editable field. */
function ReadField({
  label,
  value,
  badge,
  action,
  className,
}: {
  label: string
  value: string
  badge?: string
  /** Optional right-aligned control in the label row (e.g. an "Edit" link). */
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <span className="flex items-center gap-1.5 text-sm font-medium text-content-secondary">
        {label}
        {badge && (
          <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-content-tertiary">
            {badge}
          </span>
        )}
        {action && <span className="ms-auto">{action}</span>}
      </span>
      <div className="rounded-xl bg-bg-surface-sunken px-3.5 py-2.5 text-sm text-content-primary">
        {value || '—'}
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </div>
  )
}

/** Step 4 — a grouped review; the primary fields stay editable in place, the rest summarise. */
export function ReviewStep({ draft, patch, onEditStep }: ReviewStepProps) {
  const { t } = useTranslation()
  const categories = t('catalog.categories', { returnObjects: true }) as string[]

  const lineSummary = draft.lineItems
    .filter((i) => i.name.trim())
    .map((i) => `${i.name} ×${i.quantity}${i.unit ? i.unit : ''}`)
    .join(' · ')
  const paymentSummary = `${t(`rfq.create.payment.presets.${draft.paymentPreset}`)} · ${draft.milestones
    .map((m) => m.percent)
    .join(' / ')}`
  const deliverySummary = [draft.requiredDeliveryDate, draft.closingDate].filter(Boolean).join(' · ')
  const warrantySummary = [draft.minimumWarranty, draft.certifications.join(', ')]
    .filter(Boolean)
    .join(' · ')
  const audienceSummary =
    draft.regions.length > 0
      ? `${t('rfq.create.review.broadcast')} · ${draft.regions.join(', ')}`
      : `${t('rfq.create.review.broadcast')} · ${t('rfq.create.suppliers.allRegions')}`
  const deliverAddress = draft.deliveryAddress || t('rfq.create.delivery.sameAsCompany')

  return (
    <RfqCard title={t('rfq.create.review.title')}>
      <p className="-mt-2 mb-5 text-sm text-content-secondary">{t('rfq.create.review.subtitle')}</p>

      <div className="auth-stagger flex flex-col gap-6">
        <Section title={t('rfq.create.steps.requirement')}>
          <SearchSelect
            label={t('rfq.create.requirement.category')}
            options={categories}
            value={draft.category}
            onChange={(category) => patch({ category })}
          />
          <Field
            label={t('rfq.create.requirement.rfqTitle')}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <ReadField label={t('rfq.create.review.lineItems')} value={lineSummary} />
          <div className="flex flex-col gap-1.5">
            <span className="flex items-center gap-1.5 text-sm font-medium text-content-secondary">
              {t('rfq.create.requirement.budget')}
              <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-content-tertiary">
                {t('rfq.create.review.private')}
              </span>
            </span>
            <Input
              inputMode="numeric"
              leftIcon={<span className="text-sm text-content-tertiary">SAR</span>}
              value={draft.budget ? draft.budget.toString() : ''}
              onChange={(e) => patch({ budget: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })}
            />
          </div>
        </Section>

        <Section title={t('rfq.create.steps.delivery')}>
          <ReadField label={t('rfq.create.delivery.deliverTo')} value={deliverAddress} />
          <ReadField label={t('rfq.create.review.deliveryClosing')} value={deliverySummary} />
          <ReadField
            label={t('rfq.create.payment.title')}
            value={paymentSummary}
            className="sm:col-span-2"
            action={
              <button
                type="button"
                onClick={() => onEditStep?.(2)}
                className="cursor-pointer text-sm font-medium text-content-link hover:text-content-link-hover"
              >
                {t('rfq.create.review.edit')}
              </button>
            }
          />
          <ReadField label={t('rfq.create.review.warrantyCerts')} value={warrantySummary} />
          <ReadField label={t('rfq.create.suppliers.acceptance')} value={draft.acceptanceCriteria} />
        </Section>

        <Section title={t('rfq.create.review.visibility')}>
          <ReadField label={t('rfq.create.review.audience')} value={audienceSummary} />
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-content-secondary">
              {t('rfq.create.suppliers.nda')}
            </span>
            <div className="flex items-center justify-between rounded-xl bg-bg-surface-sunken px-3.5 py-2">
              <span className="text-sm text-content-primary">
                {draft.ndaRequired
                  ? t('rfq.create.review.ndaRequired')
                  : t('rfq.create.review.ndaNotRequired')}
              </span>
              <Switch
                label={t('rfq.create.suppliers.nda')}
                checked={draft.ndaRequired}
                onChange={(ndaRequired) => patch({ ndaRequired })}
              />
            </div>
          </div>
        </Section>

        <div
          className={cn(
            'flex items-start gap-3 rounded-xl bg-brand-subtle p-4',
            'text-sm text-content-secondary',
          )}
        >
          <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-primary" />
          <p>{t('rfq.create.review.publishNote')}</p>
        </div>
      </div>
    </RfqCard>
  )
}
