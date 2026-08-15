import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { cn } from '@/shared/lib/cn'
import { useAppendOrderMessage, useOrder } from '../hooks/orderQueries'
import { orderTotals } from '../lib'
import { Panel, SummaryRow } from './components'
import { termsLocked } from './supplierOrders'

/**
 * SupplierOrderConversationPage — the negotiation thread, continued after award.
 *
 * It is the same conversation the offer ran in, which is why the offer history stays visible: the
 * purchase order was built from one of those versions and both sides can still see which. What has
 * changed is that counter-offers are closed: price and dates are fixed by the purchase order and
 * cannot be changed at all — an order that no longer works is declined or cancelled, never amended.
 */
export function SupplierOrderConversationPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const append = useAppendOrderMessage()

  const [message, setMessage] = useState('')

  const stamp = (iso: string) => {
    const date = new Date(iso)
    const day = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(date)
    const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(date)
    return `${day} · ${time}`
  }
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/supplier/orders" replace />

  const money = (n: number) => `SAR ${Math.round(n).toLocaleString(i18n.language)}`
  const total = orderTotals(order).total
  const offers = order.offerHistory ?? []
  const messages = order.messages ?? []
  const revealed = termsLocked(order)

  const send = () => {
    const text = message.trim()
    if (!text) return
    append.mutate(
      { id: order.id, message: { by: 'supplier', text, at: new Date().toISOString() } },
      { onSuccess: () => setMessage('') },
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <button
        type="button"
        onClick={() => navigate(`/supplier/orders/${order.id}`)}
        className="mp-press cursor-pointer text-sm font-medium text-content-secondary hover:text-content-primary"
      >
        ← {t('common.back')}
      </button>

      <nav className="mt-4 text-sm text-content-tertiary">
        <button
          type="button"
          onClick={() => navigate('/supplier/orders')}
          className="cursor-pointer text-content-link hover:underline"
        >
          {t('order.supplierView.title')}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{order.poNumber}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="rounded-full bg-status-info-subtle px-2.5 py-0.5 text-xs font-medium text-status-info">
          {t('order.supplierView.conversation.inFulfilment')}
        </span>
        <span className="rounded-full bg-bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-content-secondary">
          {t('order.supplierView.conversation.termsLocked', { po: order.poNumber })}
        </span>
        {revealed && (
          <span className="rounded-full bg-status-success-subtle px-2.5 py-0.5 text-xs font-medium text-status-success-strong">
            {t('order.supplierView.conversation.identitiesRevealed')}
          </span>
        )}
      </div>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">
        {t('order.supplierView.conversation.title')}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {order.title} · {order.poNumber} · {revealed ? order.buyer.name : t('order.supplierView.verifiedBuyer')} ·{' '}
        {t('order.supplierView.conversation.fixedByPo')}
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content-primary">
              {t('order.supplierView.conversation.thread')}
            </h2>
            <span className="text-xs text-content-tertiary">
              {t('order.supplierView.conversation.historyKept')}
            </span>
          </div>

          {offers.length === 0 && messages.length === 0 && (
            <p className="mt-4 rounded-lg bg-bg-surface-sunken px-4 py-3 text-sm text-content-tertiary">
              {t('order.supplierView.conversation.empty')}
            </p>
          )}

          {/* The pre-award offer versions, kept as the audit trail of what the PO was built from. */}
          <ol className="mt-4 space-y-5">
            {offers.map((offer) => {
              const mine = offer.by === 'supplier'
              return (
                <li key={offer.version}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-xs font-semibold text-content-tertiary">
                      v{offer.version}
                    </span>
                    <span className="font-semibold text-content-primary">
                      {mine ? t('rfq.nego.you') : t('order.supplierView.conversation.buyer')}
                    </span>
                    {offer.tag && (
                      <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand-strong">
                        {t(`order.supplierView.conversation.tag.${offer.tag}`)}
                      </span>
                    )}
                    <span className="ms-auto text-xs text-content-tertiary">{stamp(offer.at)}</span>
                  </div>
                  <div
                    className={cn(
                      'mt-2 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg px-4 py-3 sm:grid-cols-4',
                      mine ? 'bg-brand-subtle/40' : 'bg-bg-surface-sunken',
                    )}
                  >
                    <Metric label={t('rfq.nego.cols.total')} value={money(offer.totalSar)} strong />
                    <Metric label={t('rfq.nego.cols.delivery')} value={dateFull(offer.deliveryDate)} />
                    <Metric label={t('rfq.nego.cols.terms')} value={offer.paymentTermsLabel} />
                    <Metric
                      label={t('rfq.nego.cols.items')}
                      value={t('rfq.detail.itemsOf', { covered: offer.itemsCovered, total: offer.itemsTotal })}
                    />
                  </div>
                  {offer.message && <p className="mt-2 text-sm text-content-secondary">{offer.message}</p>}
                </li>
              )
            })}
          </ol>

          {/* Post-award messages — logistics, not terms. */}
          {messages.length > 0 && (
            <ul className="mt-5 space-y-4 border-t border-border-subtle pt-5">
              {messages.map((entry, index) => (
                <li key={index}>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm font-semibold text-content-primary">
                      {entry.by === 'supplier' ? t('rfq.nego.you') : t('order.supplierView.conversation.buyer')}
                    </span>
                    <span className="text-xs text-content-tertiary">{stamp(entry.at)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-content-secondary">{entry.text}</p>
                </li>
              ))}
            </ul>
          )}

          <div className="mt-5 border-t border-border-subtle pt-5">
            <Textarea
              rows={2}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={t('order.supplierView.conversation.placeholder')}
            />
            <div className="mt-3 flex flex-wrap gap-3">
              <Button onClick={send} isLoading={append.isPending} disabled={!message.trim()}>
                {t('order.supplierView.conversation.send')}
              </Button>
              <Button variant="outline" onClick={() => navigate(`/supplier/orders/${order.id}`)}>
                {t('order.supplierView.conversation.attachFile')}
              </Button>
            </div>
            <p className="mt-3 text-xs text-content-tertiary">
              {t('order.supplierView.conversation.countersClosed')}
            </p>
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content-primary">
                {t('order.supplierView.conversation.agreedTerms')}
              </h2>
              <span className="rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
                {t('order.supplierView.conversation.locked')}
              </span>
            </div>
            <dl className="mt-3 space-y-2.5 text-sm">
              <SummaryRow
                label={t('order.supplierView.conversation.orderTotal')}
                value={money(total)}
                valueClass="text-content-link"
              />
              <SummaryRow
                label={t('order.supplierView.conversation.fromOffer')}
                value={`v${order.offerVersion}`}
              />
              <SummaryRow
                label={t('rfq.nego.cols.delivery')}
                value={dateFull(order.shipment.expectedArrival ?? order.shipment.deliveredAt)}
              />
              <SummaryRow
                label={t('order.supplierView.cancellation.paymentTerms')}
                value={order.paymentTermsLabel}
              />
            </dl>
          </Panel>

          <Panel className="space-y-2.5">
            <Button fullWidth onClick={() => navigate(`/supplier/orders/${order.id}/purchase-order`)}>
              {t('order.supplierView.conversation.viewPo')}
            </Button>
          </Panel>

          {revealed && (
            <Panel>
              <h2 className="text-sm font-semibold text-content-primary">{t('order.buyer')}</h2>
              <p className="mt-2 text-sm font-bold text-content-link">{order.buyer.name}</p>
              <p className="mt-1 text-xs text-content-tertiary">
                CR {order.buyer.cr} · {order.buyer.location}
              </p>
            </Panel>
          )}
        </div>
      </div>
    </section>
  )
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-content-tertiary">{label}</p>
      <p className={strong ? 'text-sm font-bold text-content-link' : 'text-sm font-medium text-content-primary'}>
        {value}
      </p>
    </div>
  )
}
