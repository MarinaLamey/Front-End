import { useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { Input } from '@/shared/ui/Input'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { RfqCard } from '../components/RfqCard'
import { ChipPicker } from '../components/ChipPicker'
import { PaymentTermsEditor } from '../components/PaymentTermsEditor'
import { validatePayment } from '../paymentRules'
import type { RfqStep } from '../rfqDraftStore'
import { categoryTypeOf, isMixedSourcing, rfqSourcing, type RfqDraft } from '../../types'

interface ReviewStepProps {
  draft: RfqDraft
  patch: (partial: Partial<RfqDraft>) => void
  /** Payment mutators — the Review step edits the schedule in place, so it needs the same
   * preset/milestone setters Step 2 uses (not a jump back to Step 2). */
  setPreset: (preset: RfqDraft['paymentPreset']) => void
  setMilestones: (milestones: RfqDraft['milestones']) => void
  /** Jump back to the step that owns a summarised group (the "Edit" links). */
  onEdit: (step: RfqStep) => void
  /** Drives the closing note: a verified org publishes on submit, an unverified one saves a draft. */
  verified: boolean
}

/** A read-only summary value styled like a filled, non-editable field. */
function ReadField({ label, value, badge }: { label: string; value: string; badge?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium text-content-secondary">
        {label}
        {badge && (
          <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-content-tertiary">
            {badge}
          </span>
        )}
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
export function ReviewStep({ draft, patch, setPreset, setMilestones, onEdit, verified }: ReviewStepProps) {
  const { t, i18n } = useTranslation()
  const categoryOptions = t('catalog.categories', { returnObjects: true }) as string[]

  // Payment is edited inline (never a jump to Step 2): opening snapshots the schedule so Cancel can
  // restore it, Save just collapses the editor — edits are already live on the draft.
  const [editingPayment, setEditingPayment] = useState(false)
  const [snapshot, setSnapshot] = useState<Pick<RfqDraft, 'paymentPreset' | 'milestones'> | null>(null)
  const openPayment = () => {
    setSnapshot({ paymentPreset: draft.paymentPreset, milestones: draft.milestones })
    setEditingPayment(true)
  }
  const cancelPayment = () => {
    if (snapshot) patch(snapshot)
    setEditingPayment(false)
  }
  const paymentValid = validatePayment(draft.milestones).valid

  const dateOnly = (value: string) =>
    value
      ? new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(
          new Date(value),
        )
      : ''
  const dateTime = (value: string) =>
    value
      ? new Intl.DateTimeFormat(i18n.language, {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(value))
      : ''

  const validItems = draft.lineItems.filter((item) => item.name.trim())
  const sourcing = rfqSourcing(draft.categories)
  // "2 categories · 3 items · goods + service" — the shape of the requirement, not a list of it.
  const lineSummary = [
    t('rfq.create.review.categoryCount', { count: draft.categories.length }),
    t('rfq.create.lineItems.count', { count: validItems.length }),
    sourcing === 'none' ? '' : t(`rfq.create.review.sourcing.${sourcing}`),
  ]
    .filter(Boolean)
    .join(' · ')

  const paymentSummary = `${t(`rfq.create.payment.presets.${draft.paymentPreset}`)} · ${draft.milestones
    .map((m) => m.percent)
    .join(' / ')}`
  // The window is two explicit instants the buyer chose, so the review states both of them.
  const deliverySummary = [
    dateOnly(draft.requiredDeliveryDate),
    draft.openingDate && t('rfq.create.review.opensOn', { date: dateTime(draft.openingDate) }),
    draft.closingDate && t('rfq.create.review.closesOn', { date: dateTime(draft.closingDate) }),
  ]
    .filter(Boolean)
    .join(' · ')
  const complianceSummary = [
    draft.minimumWarranty,
    draft.certifications.join(', '),
    draft.acceptanceCriteria.trim() ? t('rfq.create.review.acceptanceSet') : '',
  ]
    .filter(Boolean)
    .join(' · ')
  const partialBidsSummary = draft.partialBidsAllowed
    ? t('rfq.create.review.partialBidsAllowed', {
        min: draft.minItemsPerBid,
        total: validItems.length,
      })
    : t('rfq.create.review.partialBidsNone')
  const audienceSummary =
    draft.regions.length > 0
      ? `${t('rfq.create.review.broadcast')} · ${draft.regions.join(', ')}`
      : `${t('rfq.create.review.broadcast')} · ${t('rfq.create.suppliers.allRegions')}`
  const deliverAddress = draft.deliveryAddress || t('rfq.create.delivery.sameAsCompany')

  /**
   * A summarised group: its heading, the one-line summary, and the "Edit" that jumps to the step
   * that owns it — so nothing on the review is a dead end.
   */
  const editLabel = t('rfq.create.review.edit')
  const summaryRow = (title: string, value: string, jump: () => void) => (
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-content-primary">{title}</h3>
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-content-secondary">{value || '—'}</p>
        <button
          type="button"
          onClick={jump}
          className="shrink-0 cursor-pointer text-sm font-medium text-content-link hover:text-content-link-hover"
        >
          {editLabel}
        </button>
      </div>
    </div>
  )

  return (
    <RfqCard title={t('rfq.create.review.title')}>
      <p className="-mt-2 mb-5 text-sm text-content-secondary">{t('rfq.create.review.subtitle')}</p>

      <div className="auth-stagger flex flex-col gap-6">
        {/* 1 — Requirement */}
        <Section title={t('rfq.create.steps.requirement')}>
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-content-secondary">
              {t('rfq.create.requirement.category')}
            </span>
            <ChipPicker
              selected={draft.categories.map((c) => c.name)}
              options={categoryOptions}
              onChange={(names) =>
                patch({
                  categories: names.map((name) => ({ name, type: categoryTypeOf(name) })),
                  lineItems: draft.lineItems.filter((i) => names.includes(i.categoryName)),
                })
              }
              addLabel={t('rfq.create.requirement.addCategory')}
              removeLabel={t('rfq.create.lineItems.remove')}
              searchPlaceholder={t('rfq.create.requirement.categoryPlaceholder')}
              allowCustom
              customLabel={t('rfq.create.requirement.addCustomCategory')}
            />
            {isMixedSourcing(draft.categories) && (
              <p className="text-xs text-content-tertiary">
                {t('rfq.create.requirement.mixedHint')}
              </p>
            )}
          </div>
          <Field
            label={t('rfq.create.requirement.rfqTitle')}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <span className="flex items-center gap-1.5 text-sm font-medium text-content-secondary">
              {t('rfq.create.requirement.budget')}
              <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-content-tertiary">
                {t('rfq.create.review.private')}
              </span>
            </span>
            <Input
              inputMode="numeric"
              leftIcon={<span className="text-sm text-content-tertiary">SAR</span>}
              value={draft.budget ? formatSar(toHalalas(draft.budget), { locale: i18n.language, symbol: false }) : ''}
              onChange={(e) => patch({ budget: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })}
            />
          </div>
        </Section>

        {summaryRow(t('rfq.create.review.lineItems'), lineSummary, () => onEdit(1))}

        {/* 2 — Delivery & terms */}
        <Section title={t('rfq.create.steps.delivery')}>
          <ReadField label={t('rfq.create.delivery.deliverTo')} value={deliverAddress} />
          <ReadField label={t('rfq.create.review.deliveryClosing')} value={deliverySummary} />
          <div className="sm:col-span-2">
            <ReadField label={t('rfq.create.delivery.partialBids')} value={partialBidsSummary} />
          </div>
        </Section>

        {/* 3 — Payment (edited in place) */}
        {editingPayment ? (
          <div className="flex flex-col gap-3">
            <h3 className="text-sm font-semibold text-content-primary">{t('rfq.create.payment.title')}</h3>
            <div className="rounded-xl border border-border-subtle p-4">
              <PaymentTermsEditor
                budget={draft.budget}
                preset={draft.paymentPreset}
                milestones={draft.milestones}
                onPresetChange={setPreset}
                onMilestonesChange={setMilestones}
              />
              <div className="mt-4 flex justify-end gap-2">
                <Button variant="ghost" size="sm" onClick={cancelPayment}>
                  {t('rfq.create.review.cancelEdit')}
                </Button>
                <Button size="sm" disabled={!paymentValid} onClick={() => setEditingPayment(false)}>
                  {t('rfq.create.review.saveEdit')}
                </Button>
              </div>
            </div>
          </div>
        ) : (
          summaryRow(t('rfq.create.payment.title'), paymentSummary, openPayment)
        )}

        {/* 4 — Requirements & compliance */}
        {summaryRow(t('rfq.create.suppliers.complianceTitle'), complianceSummary, () => onEdit(3))}

        {/* 5 — Visibility */}
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-content-primary">{t('rfq.create.review.visibility')}</h3>
          {summaryRow(t('rfq.create.review.audience'), audienceSummary, () => onEdit(3))}
        </div>

        {/* What submitting will actually do — publish now, or hold as a draft until KYB clears. */}
        <div
          className={cn(
            'flex items-start gap-3 rounded-xl p-4 text-sm',
            verified ? 'bg-brand-subtle' : 'bg-status-warning-subtle',
          )}
        >
          <span
            className={cn(
              'mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full',
              verified ? 'bg-brand-primary' : 'bg-status-warning-strong',
            )}
          />
          <div>
            <p className={cn('font-semibold', verified ? 'text-content-primary' : 'text-status-warning-strong')}>
              {verified ? t('rfq.create.review.beforePublishTitle') : t('rfq.create.review.notVerifiedTitle')}
            </p>
            <p className={cn('mt-0.5', verified ? 'text-content-secondary' : 'text-status-warning-strong')}>
              {verified ? t('rfq.create.review.beforePublishBody') : t('rfq.create.review.notVerifiedBody')}
            </p>
          </div>
        </div>
      </div>
    </RfqCard>
  )
}
