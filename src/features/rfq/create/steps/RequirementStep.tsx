import { useTranslation } from 'react-i18next'
import { Field } from '@/shared/ui/Field'
import { Input } from '@/shared/ui/Input'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { RfqCard, RfqField } from '../components/RfqCard'
import { ChipPicker } from '../components/ChipPicker'
import { LineItemsEditor } from '../components/LineItemsEditor'
import { categoryTypeOf, rfqSourcing, type RfqDraft } from '../../types'

interface RequirementStepProps {
  draft: RfqDraft
  patch: (partial: Partial<RfqDraft>) => void
  /** Locked while amending a live RFQ — category defines the matched audience. */
  amending?: boolean
}

/** Step 1 — categories, requirement details, and the per-category line items. */
export function RequirementStep({ draft, patch, amending = false }: RequirementStepProps) {
  const { t, i18n } = useTranslation()
  const categoryOptions = t('catalog.categories', { returnObjects: true }) as string[]
  const selectedNames = draft.categories.map((c) => c.name)
  // Derived live from the selected categories — never hardcoded. `none` while nothing is picked.
  const sourcing = rfqSourcing(draft.categories)
  const sourcingLabel =
    sourcing === 'mixed'
      ? t('rfq.create.requirement.mixedHint')
      : sourcing === 'service'
        ? t('rfq.create.requirement.servicesOnly')
        : sourcing === 'goods'
          ? t('rfq.create.requirement.goodsOnly')
          : ''

  // Selecting/removing a category adds/removes its line-item group; removing one prunes its items.
  const setCategories = (names: string[]) => {
    const categories = names.map((name) => ({ name, type: categoryTypeOf(name) }))
    const lineItems = draft.lineItems.filter((item) => names.includes(item.categoryName))
    patch({ categories, lineItems })
  }

  return (
    <div className="auth-stagger flex flex-col gap-5">
      <RfqCard title={t('rfq.create.requirement.title')}>
        <div className="flex flex-col gap-4">
          <RfqField label={t('rfq.create.requirement.category')} required>
            <ChipPicker
              selected={selectedNames}
              options={categoryOptions}
              onChange={setCategories}
              addLabel={t('rfq.create.requirement.addCategory')}
              removeLabel={t('rfq.create.lineItems.remove')}
              searchPlaceholder={t('rfq.create.requirement.categoryPlaceholder')}
              allowCustom
              customLabel={t('rfq.create.requirement.addCustomCategory')}
              locked={amending}
            />
            {amending ? (
              <p className="mt-1.5 text-xs text-content-tertiary">
                {t('rfq.create.requirement.categoryLockedAmend')}
              </p>
            ) : (
              sourcingLabel && (
                <p className="mt-1.5 text-xs text-content-tertiary">{sourcingLabel}</p>
              )
            )}
          </RfqField>

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
              value={draft.budget ? formatSar(toHalalas(draft.budget), { locale: i18n.language, symbol: false }) : ''}
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
          categories={draft.categories}
          items={draft.lineItems}
          method={draft.lineInputMethod}
          budget={draft.budget}
          onItemsChange={(lineItems) => patch({ lineItems })}
          onMethodChange={(lineInputMethod) => patch({ lineInputMethod })}
        />
      </RfqCard>

      <p className="text-sm text-content-tertiary">
        <span className="text-brand-primary">•</span> {t('rfq.create.requirement.requiredHint')}
      </p>
    </div>
  )
}
