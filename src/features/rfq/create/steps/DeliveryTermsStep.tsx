import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useTenant } from '@/platform/tenancy'
import { Input } from '@/shared/ui/Input'
import { SearchSelect } from '@/shared/ui/SearchSelect'
import { Switch } from '@/shared/ui/Switch'
import { RfqCard, RfqField } from '../components/RfqCard'
import { PaymentTermsEditor } from '../components/PaymentTermsEditor'
import { PlusIcon } from '../components/icons'
import { useRfqAddresses } from '../../hooks/rfqQueries'
import { biddingWindowValid, closingBeforeDelivery, itemCount, itemsPerBidValid } from '../validation'
import type { RfqDraft } from '../../types'

interface DeliveryTermsStepProps {
  draft: RfqDraft
  patch: (partial: Partial<RfqDraft>) => void
  setPreset: (preset: RfqDraft['paymentPreset']) => void
  setMilestones: (milestones: RfqDraft['milestones']) => void
}

function daysUntil(iso: string): number | null {
  if (!iso) return null
  const diff = new Date(iso).getTime() - Date.now()
  if (Number.isNaN(diff)) return null
  return Math.ceil(diff / 86_400_000)
}

/** Step 2 — delivery details and the payment schedule. */
export function DeliveryTermsStep({ draft, patch, setPreset, setMilestones }: DeliveryTermsStepProps) {
  const { t } = useTranslation()
  const { tenant } = useTenant()
  const { data: addresses = [] } = useRfqAddresses()

  // The company address entered at registration is the default delivery target; fall back to a
  // saved address if the user reached here without registering (e.g. a demo login).
  const companyAddress = tenant.address?.trim() || addresses[0]?.label || ''
  const addressOptions = Array.from(
    new Set([companyAddress, ...addresses.map((a) => a.label)].filter(Boolean)),
  )
  const currentAddress = draft.deliverToCompanyAddress ? companyAddress : draft.deliveryAddress
  const closesIn = daysUntil(draft.closingDate)
  const datesCoherent = closingBeforeDelivery(draft)
  const windowOk = biddingWindowValid(draft)
  // The total item count is the ceiling for the items-per-bid range (max 0 = "all" = this count).
  const totalItems = itemCount(draft)
  const itemsPerBidOk = itemsPerBidValid(draft)

  // Keep the stored label in sync with the company address while "same as company" is on, so the
  // Review step and the payload always carry the resolved address.
  useEffect(() => {
    if (draft.deliverToCompanyAddress && companyAddress && draft.deliveryAddress !== companyAddress) {
      patch({ deliveryAddress: companyAddress })
    }
  }, [companyAddress, draft.deliverToCompanyAddress, draft.deliveryAddress, patch])

  return (
    <div className="auth-stagger flex flex-col gap-5">
      <RfqCard title={t('rfq.create.delivery.title')}>
        <div className="flex flex-col gap-4">
          <RfqField label={t('rfq.create.delivery.deliverTo')}>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-content-primary">
              <input
                type="checkbox"
                className="h-4 w-4 cursor-pointer accent-brand-primary"
                checked={draft.deliverToCompanyAddress}
                onChange={(e) =>
                  patch(
                    e.target.checked
                      ? { deliverToCompanyAddress: true, deliveryAddress: companyAddress }
                      : { deliverToCompanyAddress: false },
                  )
                }
              />
              {t('rfq.create.delivery.sameAsCompany')}
            </label>
            <SearchSelect
              label=""
              searchable={false}
              options={addressOptions}
              value={currentAddress}
              onChange={(label) =>
                patch({ deliveryAddress: label, deliverToCompanyAddress: label === companyAddress })
              }
              placeholder={t('rfq.create.delivery.selectAddress')}
            />
            <button
              type="button"
              className="inline-flex w-fit cursor-pointer items-center gap-1.5 text-sm font-semibold text-brand-primary hover:text-brand-primary-hover"
            >
              <PlusIcon className="h-4 w-4" />
              {t('rfq.create.delivery.addAddress')}
            </button>
          </RfqField>

          <RfqField label={t('rfq.create.delivery.requiredDate')}>
            <Input
              type="date"
              required
              value={draft.requiredDeliveryDate}
              onChange={(e) => patch({ requiredDeliveryDate: e.target.value })}
            />
          </RfqField>

          {/* The bidding window is set explicitly at BOTH ends — it is never derived from whenever
              the RFQ happens to publish, so an RFQ held for verification still knows when it opens. */}
          <RfqField label={t('rfq.create.delivery.biddingWindow')} required>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-content-tertiary">
                  {t('rfq.create.delivery.opensAt')}
                </span>
                <Input
                  type="datetime-local"
                  required
                  value={draft.openingDate}
                  onChange={(e) => patch({ openingDate: e.target.value })}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="text-xs font-medium text-content-tertiary">
                  {t('rfq.create.delivery.closesAt')}
                </span>
                <Input
                  type="datetime-local"
                  required
                  value={draft.closingDate}
                  onChange={(e) => patch({ closingDate: e.target.value })}
                />
              </label>
            </div>
            {windowOk && closesIn !== null && closesIn >= 0 && datesCoherent && (
              <span className="mt-1.5 inline-flex w-fit rounded-full bg-status-warning-subtle px-2 py-0.5 text-xs font-medium text-status-warning-strong">
                {t('rfq.create.delivery.closesIn', { count: closesIn })}
              </span>
            )}
            {!windowOk && (
              <span className="mt-1.5 text-xs font-medium text-status-danger">
                {t('rfq.create.delivery.windowBackwards')}
              </span>
            )}
            {windowOk && !datesCoherent && (
              <span className="mt-1.5 text-xs font-medium text-status-danger">
                {t('rfq.create.delivery.closingBeforeDelivery')}
              </span>
            )}
          </RfqField>

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
            <div>
              <p className="text-sm font-medium text-content-primary">
                {t('rfq.create.delivery.partial')}
              </p>
              <p className="text-xs text-content-tertiary">{t('rfq.create.delivery.partialHint')}</p>
            </div>
            <Switch
              label={t('rfq.create.delivery.partial')}
              checked={draft.partialDeliveryAllowed}
              onChange={(partialDeliveryAllowed) => patch({ partialDeliveryAllowed })}
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
            <div>
              <p className="text-sm font-medium text-content-primary">
                {t('rfq.create.delivery.partialBids')}
              </p>
              <p className="text-xs text-content-tertiary">
                {t('rfq.create.delivery.partialBidsHint')}
              </p>
            </div>
            <Switch
              label={t('rfq.create.delivery.partialBids')}
              checked={draft.partialBidsAllowed}
              onChange={(partialBidsAllowed) => patch({ partialBidsAllowed })}
            />
          </div>

          {draft.partialBidsAllowed && (
            <RfqField label={t('rfq.create.delivery.itemsPerBid')}>
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 text-sm text-content-secondary">
                  {t('rfq.create.delivery.min')}
                  <div className="w-24">
                    <Input
                      type="number"
                      min={1}
                      max={totalItems}
                      inputMode="numeric"
                      aria-label={t('rfq.create.delivery.min')}
                      value={draft.minItemsPerBid || ''}
                      onChange={(e) => patch({ minItemsPerBid: Number(e.target.value) || 0 })}
                    />
                  </div>
                </label>
                <label className="flex items-center gap-2 text-sm text-content-secondary">
                  {t('rfq.create.delivery.max')}
                  <div className="w-28">
                    <Input
                      type="number"
                      min={draft.minItemsPerBid || 1}
                      max={totalItems}
                      inputMode="numeric"
                      aria-label={t('rfq.create.delivery.max')}
                      placeholder={t('rfq.create.delivery.allCount', { count: totalItems })}
                      value={draft.maxItemsPerBid || ''}
                      onChange={(e) => patch({ maxItemsPerBid: Number(e.target.value) || 0 })}
                    />
                  </div>
                </label>
              </div>
              {itemsPerBidOk ? (
                <p className="mt-1.5 text-xs text-content-tertiary">
                  {t('rfq.create.delivery.itemsPerBidHint', {
                    min: draft.minItemsPerBid,
                    total: totalItems,
                  })}
                </p>
              ) : (
                <p className="mt-1.5 text-xs font-medium text-status-danger">
                  {t('rfq.create.delivery.itemsPerBidInvalid', { total: totalItems })}
                </p>
              )}
            </RfqField>
          )}

          <div className="flex items-center justify-between gap-3 border-t border-border-subtle pt-4">
            <div>
              <p className="text-sm font-medium text-content-primary">
                {t('rfq.create.delivery.splitAward')}
              </p>
              <p className="text-xs text-content-tertiary">
                {t('rfq.create.delivery.splitAwardHint')}
              </p>
            </div>
            <Switch
              label={t('rfq.create.delivery.splitAward')}
              checked={draft.splitAwardAllowed}
              onChange={(splitAwardAllowed) => patch({ splitAwardAllowed })}
            />
          </div>
        </div>
      </RfqCard>

      <RfqCard title={t('rfq.create.payment.title')}>
        <p className="mb-4 text-sm text-content-secondary">{t('rfq.create.payment.subtitle')}</p>
        <PaymentTermsEditor
          budget={draft.budget}
          preset={draft.paymentPreset}
          milestones={draft.milestones}
          onPresetChange={setPreset}
          onMilestonesChange={setMilestones}
        />
      </RfqCard>
    </div>
  )
}
