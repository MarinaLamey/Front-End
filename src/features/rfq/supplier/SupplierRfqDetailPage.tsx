import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { categoryLabel, rfqSourcing } from '../types'
import { useRfq, useSaveSupplierBid } from '../hooks/rfqQueries'
import { toSupplierView } from './deriveSupplierBid'
import { hasCertificateOnFile } from './supplierProfile'
import { toDraftRecord } from './bidRecord'
import { Panel } from './components'
import { useSupplierFormat } from './format'

/**
 * SupplierRfqDetailPage — everything a supplier needs to decide whether to price this RFQ.
 *
 * The buyer stays anonymous down to a category and a city; the line items, the required
 * certifications and the buyer's notes are shown in full. Two ways out: price it, or say you
 * are not interested — which is a decline the buyer can see, and which the supplier can undo
 * from the Declined tab while the RFQ is still live.
 */
export function SupplierRfqDetailPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: rfq, isLoading } = useRfq(id)
  const saveBid = useSaveSupplierBid()
  const { dateFull } = useSupplierFormat()

  const view = useMemo(() => (rfq ? toSupplierView(rfq) : null), [rfq])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq || !view) return <Navigate to="/supplier/rfqs" replace />

  const { detail, bid } = view
  const sourcing = rfqSourcing(rfq.categories)
  const closed = view.closingInDays < 0 || rfq.status !== 'live'
  const alreadyBid = bid.status === 'submitted' || bid.status === 'negotiating'

  const decline = () =>
    saveBid.mutate(
      { id: rfq.id, bid: toDraftRecord(view, 'declined') },
      { onSuccess: () => navigate('/supplier/rfqs') },
    )

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <button
        type="button"
        onClick={() => navigate('/supplier/rfqs')}
        className="mp-press cursor-pointer text-sm font-medium text-content-secondary hover:text-content-primary"
      >
        ← {t('common.back')}
      </button>

      <nav className="mt-4 text-sm text-content-tertiary">
        <button
          type="button"
          onClick={() => navigate('/supplier/rfqs')}
          className="cursor-pointer text-content-link hover:underline"
        >
          {t('rfq.supplier.available.title')}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{rfq.reference}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-content-tertiary">{rfq.reference}</span>
        <StatusBadge
          label={
            view.closingSoon ? t('rfq.supplier.available.closingSoon') : t(`rfq.statusLabel.${rfq.status}`)
          }
          tone={view.closingSoon ? 'warning' : 'success'}
          dot={false}
        />
      </div>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-content-primary">
        {rfq.title || t('rfq.list.untitled')}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {t('rfq.supplier.verifiedBuyer')} · {categoryLabel(rfq.categories)} · {detail.deliverToCity} ·{' '}
        {t('rfq.supplier.detail.identityRevealed')}
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Requested items — read-only; this is what the bid form will price. */}
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content-primary">{t('rfq.detail.requestedItems')}</h2>
              <span className="text-xs text-content-tertiary">
                {t('rfq.detail.lineItemCount', { count: detail.lineItems.length })}
              </span>
            </div>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead>
                  <tr className="border-b border-border-subtle text-xs font-medium text-content-tertiary">
                    <th className="w-8 py-2 text-start font-medium">#</th>
                    <th className="py-2 text-start font-medium">{t('rfq.detail.description')}</th>
                    <th className="py-2 text-start font-medium">{t('rfq.supplier.detail.specification')}</th>
                    <th className="w-20 py-2 text-start font-medium">{t('rfq.nego.form.qty')}</th>
                    <th className="w-16 py-2 text-start font-medium">{t('rfq.supplier.detail.unit')}</th>
                    <th className="w-24 py-2 text-start font-medium">{t('rfq.detail.neededBy')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {detail.lineItems.map((item, index) => (
                    <tr key={item.id}>
                      <td className="py-2.5 text-content-tertiary">{index + 1}</td>
                      <td className="py-2.5 font-medium text-content-primary">{item.name}</td>
                      <td className="py-2.5 text-content-secondary">{item.specification}</td>
                      <td className="py-2.5 text-content-secondary">
                        {item.quantity.toLocaleString()}
                        {/* The range this line will be accepted within — shown here, not just on the
                            bid form, so the supplier knows the constraint before deciding to bid. */}
                        {(item.minQuantity !== undefined || item.maxQuantity !== undefined) && (
                          <span className="block text-xs text-content-tertiary">
                            {t('rfq.detail.acceptsRange', {
                              min: (item.minQuantity ?? 0).toLocaleString(),
                              max: (item.maxQuantity ?? item.quantity).toLocaleString(),
                            })}
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-content-secondary">{item.unit}</td>
                      <td className="py-2.5 text-content-secondary">{dateFull(detail.neededBy)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>

          {/* Requirements — each certification reads as on file or still required (spec §5). */}
          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.detail.requirements')}</h2>
            <p className="mt-3 text-xs font-medium text-content-tertiary">
              {t('rfq.supplier.detail.requiredCerts')}
            </p>
            <ul className="mt-2 flex flex-wrap gap-2">
              {detail.certifications.map((cert) => {
                const onFile = hasCertificateOnFile(cert)
                return (
                  <li
                    key={cert}
                    className={cn(
                      'rounded-md px-2.5 py-1 text-xs font-medium',
                      onFile
                        ? 'bg-status-success-subtle text-status-success-strong'
                        : 'bg-status-warning-subtle text-status-warning-strong',
                    )}
                  >
                    {cert} ·{' '}
                    {onFile ? t('rfq.supplier.detail.onFile') : t('rfq.supplier.detail.certRequired')}
                  </li>
                )
              })}
            </ul>

            <p className="mt-4 text-xs font-medium text-content-tertiary">
              {t('rfq.supplier.detail.buyerNotes')}
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-content-secondary">
              {detail.notes || t('rfq.detail.sampleNote')}
            </p>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.supplier.detail.keyDetails')}</h2>
            <dl className="mt-3 space-y-3 text-sm">
              <Stack
                label={t('rfq.detail.closing')}
                value={
                  closed
                    ? dateFull(rfq.closingDate)
                    : `${t('rfq.detail.daysLeft', { count: view.closingInDays })} · ${dateFull(rfq.closingDate)}`
                }
              />
              <Stack label={t('rfq.supplier.detail.deliveryRequiredBy')} value={dateFull(detail.neededBy)} />
              <Stack
                label={t('rfq.supplier.detail.deliverTo')}
                value={rfq.deliveryAddress || detail.deliverToCity}
              />
              <Stack
                label={t('rfq.supplier.detail.paymentTerms')}
                value={`${t(`rfq.create.payment.presets.${rfq.paymentPreset}`)} ${rfq.milestones
                  .map((m) => m.percent)
                  .join(' / ')}`}
              />
              <Stack
                label={t('rfq.supplier.detail.rfqType')}
                value={t(`rfq.supplier.detail.sourcing.${sourcing}`)}
              />
            </dl>
          </Panel>

          <Panel className="space-y-2.5">
            {alreadyBid ? (
              <>
                <Button fullWidth onClick={() => navigate(`/supplier/bids/${rfq.id}`)}>
                  {t('rfq.supplier.available.viewYourBid')}
                </Button>
                <p className="pt-1 text-xs text-content-tertiary">{t('rfq.supplier.detail.alreadyBid')}</p>
              </>
            ) : closed ? (
              <>
                <Button fullWidth variant="outline" onClick={() => navigate('/supplier/rfqs')}>
                  {t('rfq.supplier.bid.backToAvailable')}
                </Button>
                <p className="pt-1 text-xs text-content-tertiary">{t('rfq.supplier.detail.closedNote')}</p>
              </>
            ) : (
              <>
                <Button fullWidth onClick={() => navigate(`/supplier/rfqs/${rfq.id}/bid`)}>
                  {bid.status === 'draft'
                    ? t('rfq.supplier.available.resumeDraft')
                    : t('rfq.supplier.detail.submitBid')}
                </Button>
                <Button fullWidth variant="outline" onClick={decline} isLoading={saveBid.isPending}>
                  {t('rfq.supplier.detail.notInterested')}
                </Button>
                <p className="pt-1 text-xs text-content-tertiary">{t('rfq.supplier.detail.anonymityNote')}</p>
              </>
            )}
          </Panel>
        </div>
      </div>
    </section>
  )
}

/** Stacked label-over-value, the shape the Key details rail uses. */
function Stack({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs text-content-tertiary">{label}</dt>
      <dd className="mt-0.5 font-semibold text-content-primary">{value}</dd>
    </div>
  )
}
