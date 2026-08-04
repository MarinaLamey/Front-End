import { useTranslation } from 'react-i18next'
import { Input } from '@/shared/ui/Input'
import { Switch } from '@/shared/ui/Switch'
import { Textarea } from '@/shared/ui/Textarea'
import { RfqCard, RfqField } from '../components/RfqCard'
import { ChipPicker } from '../components/ChipPicker'
import { PlusIcon } from '../components/icons'
import type { RfqDraft } from '../../types'

interface SuppliersStepProps {
  draft: RfqDraft
  patch: (partial: Partial<RfqDraft>) => void
}

/** Step 3 — compliance requirements and who may bid. */
export function SuppliersStep({ draft, patch }: SuppliersStepProps) {
  const { t } = useTranslation()
  const certOptions = t('rfq.create.suppliers.certOptions', { returnObjects: true }) as string[]
  const regionOptions = t('rfq.create.suppliers.regions', { returnObjects: true }) as string[]

  return (
    <div className="auth-stagger flex flex-col gap-5">
      <RfqCard title={t('rfq.create.suppliers.complianceTitle')}>
        <div className="flex flex-col gap-4">
          <RfqField label={t('rfq.create.suppliers.acceptance')}>
            <Textarea
              rows={3}
              placeholder={t('rfq.create.suppliers.acceptancePlaceholder')}
              value={draft.acceptanceCriteria}
              onChange={(e) => patch({ acceptanceCriteria: e.target.value })}
            />
            <p className="mt-1.5 text-xs text-content-tertiary">
              {t('rfq.create.suppliers.acceptanceHint')}
            </p>
          </RfqField>

          <label className="inline-flex w-fit cursor-pointer items-center gap-1.5 rounded-lg border border-border-default px-3 py-2 text-sm font-medium text-content-secondary transition-colors hover:border-brand-primary hover:text-brand-primary">
            <PlusIcon className="h-4 w-4" />
            {draft.specDocumentName || t('rfq.create.suppliers.attachSpec')}
            <input
              type="file"
              className="hidden"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => patch({ specDocumentName: e.target.files?.[0]?.name ?? '' })}
            />
          </label>

          <RfqField label={t('rfq.create.suppliers.certifications')}>
            <ChipPicker
              selected={draft.certifications}
              options={certOptions}
              onChange={(certifications) => patch({ certifications })}
              addLabel={t('rfq.create.suppliers.add')}
              removeLabel={t('rfq.create.lineItems.remove')}
              searchPlaceholder={t('rfq.create.suppliers.searchCert')}
              allowCustom
              customLabel={t('rfq.create.suppliers.addCustomCert')}
            />
          </RfqField>

          <RfqField label={t('rfq.create.suppliers.warranty')}>
            <Input
              placeholder={t('rfq.create.suppliers.warrantyPlaceholder')}
              value={draft.minimumWarranty}
              onChange={(e) => patch({ minimumWarranty: e.target.value })}
            />
          </RfqField>

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
            <div>
              <p className="text-sm font-medium text-content-primary">
                {t('rfq.create.suppliers.nda')}
              </p>
              <p className="text-xs text-content-tertiary">{t('rfq.create.suppliers.ndaHint')}</p>
            </div>
            <Switch
              label={t('rfq.create.suppliers.nda')}
              checked={draft.ndaRequired}
              onChange={(ndaRequired) => patch({ ndaRequired })}
            />
          </div>
        </div>
      </RfqCard>

      <RfqCard title={t('rfq.create.suppliers.whoCanBid')}>
        <div className="flex flex-col gap-3">
          <RfqField label={t('rfq.create.suppliers.supplierRegions')}>
            <ChipPicker
              selected={draft.regions}
              options={regionOptions}
              onChange={(regions) => patch({ regions })}
              addLabel={t('rfq.create.suppliers.addRegion')}
              removeLabel={t('rfq.create.lineItems.remove')}
              searchPlaceholder={t('rfq.create.suppliers.searchRegion')}
              placeholderChip={t('rfq.create.suppliers.allRegions')}
            />
          </RfqField>

          <p className="text-sm text-content-secondary">{t('rfq.create.suppliers.broadcastHint')}</p>

          <label className="flex cursor-not-allowed items-center gap-2 text-sm text-content-disabled">
            <input type="checkbox" disabled className="h-4 w-4 accent-brand-primary" />
            {t('rfq.create.suppliers.favouritesOnly')}
          </label>
        </div>
      </RfqCard>
    </div>
  )
}
