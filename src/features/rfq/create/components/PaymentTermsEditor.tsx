import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { SearchSelect } from '@/shared/ui/SearchSelect'
import { cn } from '@/shared/lib/cn'
import { formatSar, splitByPercent, toHalalas } from '@/shared/lib/money'
import {
  kindOf,
  milestoneId,
  validatePayment,
  MILESTONE_TRIGGERS,
  type Milestone,
  type PaymentPreset,
} from '../paymentRules'
import { PaymentSplitBar, SEGMENT_CLASS } from './PaymentSplitBar'
import { CloseIcon, InfoIcon, PlusIcon, TabbyMark, TamaraMark } from './icons'

interface PaymentTermsEditorProps {
  budget: number
  preset: PaymentPreset
  milestones: Milestone[]
  onPresetChange: (preset: PaymentPreset) => void
  onMilestonesChange: (milestones: Milestone[]) => void
  /** Replaces the "you're proposing these terms" banner body — the wording differs by context
   * (a draft RFQ proposes to every bidder; a counter-offer proposes to one supplier). */
  notice?: ReactNode
  /** Replaces the note under the Total row. Defaults to the wizard's private-estimate caveat;
   * pass `null` where the schedule needs no caveat at all. */
  footnote?: ReactNode | null
  /** Surface the payment-rule failure message beside the Total. Off where the schedule is already
   * constrained by the offer it belongs to and the extra copy would just add noise. */
  showRules?: boolean
}

const PRESETS: { value: PaymentPreset; titleKey: string; subKey: string }[] = [
  { value: 'staged', titleKey: 'rfq.create.payment.presets.staged', subKey: 'rfq.create.payment.presets.stagedSub' },
  { value: 'fifty', titleKey: 'rfq.create.payment.presets.fifty', subKey: 'rfq.create.payment.presets.fiftySub' },
  { value: 'custom', titleKey: 'rfq.create.payment.presets.custom', subKey: 'rfq.create.payment.presets.customSub' },
]

const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)))

/** Small purple index chip that precedes each milestone row. */
function IndexBadge({ n }: { n: number }) {
  return (
    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-strong">
      {n}
    </span>
  )
}

/**
 * PaymentTermsEditor — step 2's payment schedule. Presets stamp read-only rows + a legend; Custom
 * unlocks editable rows that name the broken rule the moment one breaks. Every `= SAR` amount comes
 * from `splitByPercent` (exact largest-remainder), so the rows always reconcile to the budget. All
 * validation is delegated to the pure `validatePayment` engine.
 */
export function PaymentTermsEditor({
  budget,
  preset,
  milestones,
  onPresetChange,
  onMilestonesChange,
  notice,
  footnote,
  showRules = true,
}: PaymentTermsEditorProps) {
  const { t } = useTranslation()

  const budgetHalalas = toHalalas(budget)
  const hasBudget = budgetHalalas > 0
  const amounts = splitByPercent(budgetHalalas, milestones.map((m) => m.percent))
  const validation = validatePayment(milestones)
  const isCustom = preset === 'custom'

  const amountLabel = (index: number) => (hasBudget ? formatSar(amounts[index]) : '—')

  const update = (id: string, partial: Partial<Milestone>) =>
    onMilestonesChange(milestones.map((m) => (m.id === id ? { ...m, ...partial } : m)))
  const remove = (id: string) => onMilestonesChange(milestones.filter((m) => m.id !== id))
  const add = () =>
    onMilestonesChange([...milestones, { id: milestoneId(), trigger: 'on_delivery', percent: 0 }])

  return (
    <div className="flex flex-col gap-4">
      {/* Presets */}
      <div className="grid gap-3 sm:grid-cols-3">
        {PRESETS.map((option) => {
          const active = preset === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onPresetChange(option.value)}
              className={cn(
                'cursor-pointer rounded-xl border p-3 text-start transition-colors',
                active
                  ? 'border-brand-primary bg-brand-subtle'
                  : 'border-border-subtle bg-bg-surface hover:border-border-default',
              )}
            >
              <span className="block text-sm font-semibold text-content-primary">
                {t(option.titleKey)}
              </span>
              <span className="mt-0.5 block text-xs text-content-tertiary">{t(option.subKey)}</span>
            </button>
          )
        })}
      </div>

      {/* The schedule is a PROPOSAL whichever template it came from, so the note stands on every
          preset — not just Custom. */}
      <div className="flex items-start gap-2 rounded-lg bg-status-info-subtle p-3 text-sm">
        <span className="mt-0.5 shrink-0 text-status-info">
          <InfoIcon className="h-4 w-4" />
        </span>
        <p className="text-content-secondary">{notice ?? t('rfq.create.payment.proposing')}</p>
      </div>

      <PaymentSplitBar milestones={milestones} />

      {/* Legend (presets only) */}
      {!isCustom && (
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-content-secondary">
          {milestones.map((milestone) => (
            <span key={milestone.id} className="flex items-center gap-1.5">
              <span className={cn('h-2 w-2 rounded-full', SEGMENT_CLASS[kindOf(milestone.trigger)])} />
              {milestone.percent}% {t(`rfq.create.payment.kinds.${kindOf(milestone.trigger)}`)}
            </span>
          ))}
        </div>
      )}

      {/* Milestone rows */}
      <ul className="flex flex-col">
        {milestones.map((milestone, index) => (
          <li key={milestone.id} className="flex items-center gap-3 py-2">
            <IndexBadge n={index + 1} />

            {isCustom ? (
              <div className="flex-1">
                <SearchSelect
                  label=""
                  searchable={false}
                  value={t(`rfq.create.payment.triggers.${milestone.trigger}`)}
                  options={MILESTONE_TRIGGERS.map((tr) => t(`rfq.create.payment.triggers.${tr}`))}
                  onChange={(label) => {
                    const next = MILESTONE_TRIGGERS.find(
                      (tr) => t(`rfq.create.payment.triggers.${tr}`) === label,
                    )
                    if (next) update(milestone.id, { trigger: next })
                  }}
                />
              </div>
            ) : (
              <div className="flex-1">
                <p className="text-sm font-medium text-content-primary">
                  {t(`rfq.create.payment.kinds.${kindOf(milestone.trigger)}`)}
                </p>
                <p className="text-xs text-content-tertiary">
                  {t(`rfq.create.payment.triggers.${milestone.trigger}`)}
                </p>
              </div>
            )}

            {isCustom ? (
              <div
                className={cn(
                  'flex w-[72px] items-center rounded-lg bg-bg-surface outline outline-1 ps-2.5 pe-2',
                  validation.flaggedIndex === index
                    ? 'outline-status-danger'
                    : 'outline-border-default focus-within:outline-2 focus-within:outline-border-focus',
                )}
              >
                <input
                  type="number"
                  min={0}
                  max={100}
                  aria-label={t('rfq.create.payment.milestonePercent')}
                  value={milestone.percent || ''}
                  onChange={(e) => update(milestone.id, { percent: clampPercent(Number(e.target.value) || 0) })}
                  className={cn(
                    'w-full bg-transparent py-2 text-sm outline-none',
                    validation.flaggedIndex === index ? 'text-status-danger' : 'text-content-primary',
                  )}
                />
                <span
                  className={cn(
                    'text-sm',
                    validation.flaggedIndex === index ? 'text-status-danger' : 'text-content-tertiary',
                  )}
                >
                  %
                </span>
              </div>
            ) : (
              <span className="text-sm font-semibold text-brand-primary">{milestone.percent}%</span>
            )}

            <span className="w-28 text-end text-sm font-medium text-content-primary">
              {isCustom ? `= ${amountLabel(index)}` : amountLabel(index)}
            </span>

            {isCustom && (
              <button
                type="button"
                aria-label={t('rfq.create.lineItems.remove')}
                disabled={milestones.length <= 1}
                onClick={() => remove(milestone.id)}
                className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-content-tertiary transition-colors hover:bg-status-danger-subtle hover:text-status-danger disabled:cursor-not-allowed disabled:opacity-40"
              >
                <CloseIcon className="h-4 w-4" />
              </button>
            )}
          </li>
        ))}
      </ul>

      {isCustom && (
        // No cap: a custom schedule is any list of milestones whose percentages total 100%.
        <button
          type="button"
          onClick={add}
          className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover"
        >
          <PlusIcon className="h-4 w-4" />
          {t('rfq.create.payment.addMilestone')}
        </button>
      )}

      {/* Total */}
      <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-content-primary">
            {t('rfq.create.payment.total')}
          </span>
          {/* Silent when the schedule is valid (the Figma total row carries nothing else); the rule
              that is actually broken is named the moment it breaks, so a disabled Next is explained. */}
          {isCustom && showRules && !validation.valid && validation.reasonKey && (
            <span className="text-xs font-medium text-status-danger">
              {t(`rfq.create.payment.reason.${validation.reasonKey}`)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-4">
          <span
            className={cn(
              'text-sm font-semibold',
              validation.totalPercent === 100 ? 'text-content-primary' : 'text-status-danger',
            )}
          >
            {validation.totalPercent}%
          </span>
          <span className="text-sm font-semibold text-content-primary">
            {hasBudget ? formatSar(budgetHalalas) : '—'}
          </span>
        </div>
      </div>

      {footnote !== null && (
        <p className="text-xs text-content-tertiary">{footnote ?? t('rfq.create.payment.privateEstimate')}</p>
      )}

      <div className="flex items-center gap-2 rounded-lg bg-bg-surface-sunken px-3 py-2 text-xs text-content-secondary">
        <span className="flex shrink-0 items-center gap-1">
          <TabbyMark className="h-5 w-5" />
          <TamaraMark className="h-5 w-5" />
        </span>
        {t('rfq.create.payment.comingSoon')}
      </div>
    </div>
  )
}
