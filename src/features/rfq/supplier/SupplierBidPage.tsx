import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { useRfq, useSaveNegotiation, useSaveSupplierBid } from '../hooks/rfqQueries'
import type { SupplierBidStatus } from '../types'
import { toSupplierView } from './deriveSupplierBid'
import { SUPPLIER_PROFILE } from './supplierProfile'
import { bidRecordFrom } from './bidRecord'
import { Panel, StatusNote, SummaryRow } from './components'
import { useSupplierFormat } from './format'
import { WithdrawBidDialog } from './WithdrawBidDialog'

/** Which banner a bid state gets, and the badge tone beside the heading. */
const TONE: Partial<Record<SupplierBidStatus, 'info' | 'success' | 'danger' | 'warning'>> = {
  submitted: 'info',
  negotiating: 'warning',
  won: 'success',
  lost: 'danger',
  withdrawn: 'warning',
  expired: 'warning',
  cancelled: 'danger',
  draft: 'info',
}

/**
 * SupplierBidPage — the supplier's own bid, exactly as it was sent.
 *
 * One screen, several states: awaiting review (withdrawable until the RFQ closes), won (with the
 * purchase order waiting), and lost (kept for the supplier's records, with no word on who won or
 * at what price — spec §2). Pricing is read-only here; changing a price or a date means the buyer
 * has to open a negotiation.
 */
export function SupplierBidPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: rfq, isLoading } = useRfq(id)
  const saveBid = useSaveSupplierBid()
  const saveNego = useSaveNegotiation()
  const { money, dateFull } = useSupplierFormat()

  const [withdrawOpen, setWithdrawOpen] = useState(false)

  const view = useMemo(() => (rfq ? toSupplierView(rfq) : null), [rfq])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq || !view) return <Navigate to="/supplier/bids" replace />
  if (view.bid.status === 'draft' || view.bid.status === 'invited') {
    return <Navigate to={`/supplier/rfqs/${id}/bid`} replace />
  }

  const { bid } = view
  const status = bid.status
  const tone = TONE[status] ?? 'info'
  const canWithdraw = (status === 'submitted' || status === 'negotiating') && view.closingInDays >= 0
  const awardedTotal = rfq.awards?.find((award) => award.bidId === bid.bid?.id)?.agreedTotalSar

  /** Withdrawing pulls the bid AND closes any conversation it was part of. */
  const withdraw = (reason: string) => {
    if (bid.thread) {
      saveNego.mutate({ id: rfq.id, thread: { ...bid.thread, status: 'ended' } })
    }
    saveBid.mutate(
      { id: rfq.id, bid: bidRecordFrom(view, { status: 'withdrawn', withdrawReason: reason }) },
      { onSuccess: () => navigate('/supplier/bids') },
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <button
        type="button"
        onClick={() => navigate('/supplier/bids')}
        className="mp-press cursor-pointer text-sm font-medium text-content-secondary hover:text-content-primary"
      >
        ← {t('common.back')}
      </button>

      <nav className="mt-4 text-sm text-content-tertiary">
        <button
          type="button"
          onClick={() => navigate('/supplier/bids')}
          className="cursor-pointer text-content-link hover:underline"
        >
          {t('rfq.supplier.myBids.title')}
        </button>
        <span className="mx-1.5">/</span>
        <button
          type="button"
          onClick={() => navigate(`/supplier/rfqs/${rfq.id}`)}
          className="cursor-pointer text-content-link hover:underline"
        >
          {rfq.reference}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{t('rfq.supplier.bid.yourBid')}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          {t('rfq.supplier.bid.yourBid')}
        </h1>
        <StatusBadge
          label={t(`rfq.supplier.bidStatus.${status}`)}
          tone={tone === 'warning' ? 'warning' : tone === 'success' ? 'success' : tone === 'danger' ? 'danger' : 'info'}
          dot={false}
        />
      </div>
      <p className="mt-1 text-sm text-content-secondary">
        {rfq.title || t('rfq.list.untitled')} · {rfq.reference} ·{' '}
        {t(`rfq.supplier.bid.subtitle.${status}`, { date: dateFull(bid.submittedAt ?? rfq.updatedAt) })}
      </p>

      <div className="mt-4">
        <StatusNote tone={tone}>
          {t(`rfq.supplier.bid.banner.${status}`, {
            date: dateFull(rfq.awards?.[0]?.awardedAt ?? rfq.updatedAt),
            reason: bid.withdrawReason ?? '',
          })}
        </StatusNote>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <PricingSummary view={view} money={money} dateFull={dateFull} />

          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.supplier.terms.title')}</h2>

            <p className="mt-3 text-xs font-medium text-content-tertiary">
              {t('rfq.supplier.terms.validUntil')}
            </p>
            <p className="mt-1 text-sm text-content-primary">{dateFull(bid.validUntil)}</p>

            <p className="mt-4 text-sm font-semibold text-content-primary">
              {t('rfq.supplier.detail.paymentTerms')}
            </p>
            <p className="mt-1 text-sm text-content-secondary">
              {t('rfq.supplier.terms.buyerTerms', { terms: bid.paymentTermsLabel })} ·{' '}
              {t(`rfq.supplier.terms.${bid.paymentTermsKind}`)}
            </p>

            <p className="mt-4 text-xs font-medium text-content-tertiary">
              {t('rfq.supplier.terms.attachments')}
            </p>
            <ul className="mt-2 space-y-2">
              {bid.attachments.map((name) => {
                const doc = SUPPLIER_PROFILE.savedDocuments.find((d) => d.name === name)
                return (
                  <li key={name} className="rounded-lg bg-bg-surface-sunken px-3 py-2.5 text-sm text-content-secondary">
                    {name}
                    {doc && <span className="text-content-tertiary"> · {doc.sizeKb} KB</span>}
                  </li>
                )
              })}
              {bid.attachments.length === 0 && (
                <li className="text-sm text-content-tertiary">{t('rfq.supplier.terms.noAttachments')}</li>
              )}
            </ul>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.supplier.summary.title')}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <SummaryRow
                label={t('rfq.supplier.summary.itemsPriced')}
                value={t('rfq.bidsInbox.nOfM', { n: bid.itemsQuoted, m: bid.itemsTotal })}
              />
              <SummaryRow label={t('rfq.supplier.summary.delivery')} value={dateFull(bid.deliveryDate)} />
              <SummaryRow label={t('rfq.supplier.summary.validUntil')} value={dateFull(bid.validUntil)} />
              <SummaryRow
                label={status === 'won' ? t('rfq.supplier.summary.awardedTotal') : t('rfq.supplier.bidTotal')}
                value={money(awardedTotal ?? bid.totalSar)}
                valueClass="text-content-link"
              />
            </dl>
          </Panel>

          <Panel className="space-y-2.5">
            {status === 'won' ? (
              <Button fullWidth onClick={() => navigate('/supplier/orders')}>
                {t('rfq.supplier.bid.viewPurchaseOrder')}
              </Button>
            ) : status === 'negotiating' ? (
              <Button fullWidth onClick={() => navigate(`/supplier/negotiations/${rfq.id}`)}>
                {t('rfq.supplier.bid.openNegotiation')}
              </Button>
            ) : canWithdraw ? (
              <Button fullWidth onClick={() => setWithdrawOpen(true)}>
                {t('rfq.supplier.withdraw.action')}
              </Button>
            ) : (
              <Button fullWidth onClick={() => navigate('/supplier/rfqs')}>
                {t('rfq.supplier.bid.backToAvailable')}
              </Button>
            )}

            <Button fullWidth variant="outline" onClick={() => navigate(`/supplier/rfqs/${rfq.id}`)}>
              {t('rfq.supplier.bid.viewRfq')}
            </Button>

            {canWithdraw && status === 'negotiating' && (
              <Button
                fullWidth
                variant="ghost"
                className="text-status-danger hover:bg-status-danger-subtle"
                onClick={() => setWithdrawOpen(true)}
              >
                {t('rfq.supplier.withdraw.action')}
              </Button>
            )}

            <p className="pt-1 text-xs text-content-tertiary">{t(`rfq.supplier.bid.railNote.${status}`)}</p>
          </Panel>
        </div>
      </div>

      <WithdrawBidDialog
        open={withdrawOpen}
        reference={rfq.reference}
        onClose={() => setWithdrawOpen(false)}
        onConfirm={withdraw}
        loading={saveBid.isPending}
      />
    </section>
  )
}

/** The read-only pricing table, shared shape with the bid form so the two read identically. */
function PricingSummary({
  view,
  money,
  dateFull,
}: {
  view: ReturnType<typeof toSupplierView>
  money: (sar: number) => string
  dateFull: (iso: string) => string
}) {
  const { t } = useTranslation()
  const { detail, bid } = view

  return (
    <Panel>
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-primary">{t('rfq.supplier.submit.pricing')}</h2>
        <span className="text-xs text-content-tertiary">{t('rfq.supplier.pricesIncludeVat')}</span>
      </div>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[680px] text-sm">
          <thead>
            <tr className="border-b border-border-subtle text-xs font-medium text-content-tertiary">
              <th className="w-8 py-2 text-start font-medium">#</th>
              <th className="py-2 text-start font-medium">{t('rfq.detail.description')}</th>
              <th className="w-[130px] py-2 text-start font-medium">{t('rfq.nego.form.qty')}</th>
              <th className="w-14 py-2 text-start font-medium">{t('rfq.supplier.detail.unit')}</th>
              <th className="w-28 py-2 text-start font-medium">{t('rfq.supplier.submit.unitPrice')}</th>
              <th className="w-28 py-2 text-end font-medium">{t('rfq.nego.form.lineTotal')}</th>
              <th className="w-28 py-2 text-start font-medium">{t('rfq.supplier.submit.deliveryDate')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-subtle">
            {bid.lines.map((line) => {
              const item = detail.lineItems[line.index]
              if (!item) return null
              const off = !line.included || line.unitPriceSar <= 0
              const short = !off && line.quantity < item.quantity
              return (
                <tr key={line.index} className={cn(off && 'text-content-tertiary')}>
                  <td className="py-2.5 text-content-tertiary">{line.index + 1}</td>
                  <td className={cn('py-2.5', off ? 'text-content-tertiary' : 'font-medium text-content-primary')}>
                    {item.name}
                  </td>
                  <td className="py-2.5">
                    {off ? (
                      '—'
                    ) : (
                      <>
                        <span className="font-medium text-content-primary">{line.quantity.toLocaleString()}</span>
                        <span className={cn('ms-1.5 text-xs', short ? 'text-status-danger' : 'text-content-tertiary')}>
                          {t('rfq.supplier.submit.ofQty', { qty: item.quantity.toLocaleString() })}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="py-2.5 text-content-secondary">{item.unit}</td>
                  <td className="py-2.5 text-content-secondary">{off ? '—' : line.unitPriceSar.toFixed(2)}</td>
                  <td className="py-2.5 text-end">
                    {off ? (
                      <span className="text-content-tertiary">{t('rfq.supplier.submit.notSupplying')}</span>
                    ) : (
                      <span className="font-medium text-content-primary">
                        {money(line.unitPriceSar * line.quantity)}
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 text-content-secondary">{off ? '—' : dateFull(line.deliveryDate)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-content-tertiary">
        {bid.itemsQuoted === bid.itemsTotal
          ? t('rfq.supplier.bid.allQuoted', { count: bid.itemsTotal })
          : t('rfq.supplier.bid.someQuoted', { n: bid.itemsQuoted, m: bid.itemsTotal })}
        {bid.shortLines > 0 && ` · ${t('rfq.supplier.bid.reducedQty', { count: bid.shortLines })}`}
      </p>

      <dl className="mt-3 space-y-2 border-t border-border-subtle pt-3 text-sm">
        <SummaryRow
          label={t('rfq.supplier.submit.subtotal', { count: bid.itemsQuoted })}
          value={money(bid.subtotalSar)}
        />
        <SummaryRow label={t('rfq.supplier.vatLine')} value={money(bid.vatSar)} />
        <div className="flex items-center justify-between border-t border-border-subtle pt-2">
          <span className="font-semibold text-content-primary">
            {bid.status === 'won' ? t('rfq.supplier.summary.awardedTotal') : t('rfq.supplier.bidTotal')}
          </span>
          <span className="text-base font-bold text-content-link">{money(bid.totalSar)}</span>
        </div>
      </dl>
    </Panel>
  )
}
