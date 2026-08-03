import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/Field'
import { Input } from '@/shared/ui/Input'
import { SearchSelect } from '@/shared/ui/SearchSelect'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { RfqCard, RfqField } from '../components/RfqCard'
import { AiSuggestionBanner } from '../components/AiSuggestionBanner'
import { LineItemsEditor } from '../components/LineItemsEditor'
import { ScopeDeliverables } from '../components/ScopeDeliverables'
import type { RfqDraft, SourcingType } from '../../types'

interface RequirementStepProps {
  draft: RfqDraft
  patch: (partial: Partial<RfqDraft>) => void
}

/** Step 1 — Requirement details, line items, and (for services) scope & deliverables. */
export function RequirementStep({ draft, patch }: RequirementStepProps) {
  const { t } = useTranslation()
  const categories = t('catalog.categories', { returnObjects: true }) as string[]
  const showScope = draft.sourcing === 'service' || draft.sourcing === 'both'

  const applySuggestion = () => {
    const suggested = 'SASO conformity'
    if (!draft.certifications.includes(suggested)) {
      patch({ certifications: [...draft.certifications, suggested] })
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <RfqCard title={t('rfq.create.requirement.title')}>
        <div className="flex flex-col gap-4">
          <RfqField label={t('rfq.create.requirement.sourcing')}>
            <SegmentedControl<SourcingType>
              ariaLabel={t('rfq.create.requirement.sourcing')}
              value={draft.sourcing}
              onChange={(sourcing) => patch({ sourcing })}
              options={[
                { value: 'goods', label: t('rfq.create.requirement.goods') },
                { value: 'service', label: t('rfq.create.requirement.service') },
                { value: 'both', label: t('rfq.create.requirement.both') },
              ]}
            />
          </RfqField>

          <SearchSelect
            label={t('rfq.create.requirement.category')}
            required
            options={categories}
            value={draft.category}
            onChange={(category) => patch({ category })}
            placeholder={t('rfq.create.requirement.categoryPlaceholder')}
          />

          <Field
            label={t('rfq.create.requirement.rfqTitle')}
            required
            placeholder={t('rfq.create.requirement.rfqTitlePlaceholder')}
            value={draft.title}
            onChange={(e) => patch({ title: e.target.value })}
          />

          <RfqField label={t('rfq.create.requirement.budget')}>
            <Input
              inputMode="numeric"
              leftIcon={<span className="text-sm text-content-tertiary">SAR</span>}
              placeholder="0"
              value={draft.budget ? draft.budget.toString() : ''}
              onChange={(e) => patch({ budget: Number(e.target.value.replace(/[^\d]/g, '')) || 0 })}
            />
            <p className="mt-1.5 text-xs text-content-tertiary">
              {t('rfq.create.requirement.budgetHint')}
            </p>
          </RfqField>
        </div>
      </RfqCard>

      <RfqCard
        title={t('rfq.create.lineItems.title')}
        action={
          <span className="rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-semibold text-brand-strong">
            {t('rfq.create.lineItems.bundled')}
          </span>
        }
      >
        <LineItemsEditor
          items={draft.lineItems}
          method={draft.lineInputMethod}
          onItemsChange={(lineItems) => patch({ lineItems })}
          onMethodChange={(lineInputMethod) => patch({ lineInputMethod })}
        />
      </RfqCard>

      {showScope && (
        <ScopeDeliverables
          scopeOfWork={draft.scopeOfWork}
          deliverables={draft.deliverables}
          timeline={draft.timeline}
          onScopeChange={(scopeOfWork) => patch({ scopeOfWork })}
          onDeliverablesChange={(deliverables) => patch({ deliverables })}
          onTimelineChange={(timeline) => patch({ timeline })}
        />
      )}

      <AiSuggestionBanner body={t('rfq.create.ai.body')} onApply={applySuggestion} />

      <p className="text-sm text-content-tertiary">
        <span className="text-brand-primary">•</span> {t('rfq.create.requirement.requiredHint')}
      </p>
    </div>
  )
}
