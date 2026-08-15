import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { useDeclinePurchaseOrder, useOrder } from '../hooks/orderQueries'
import { orderTotals } from '../lib'
import { Panel, ReasonChips, SummaryRow } from './components'

/** The reasons a supplier can give — the note is required whichever they pick. */
const REASONS = [
  'delivery_date',
  'stock_unavailable',
  'price_not_viable',
  'capacity',
  'terms_unacceptable',
  'other',
]

const MIN_NOTE = 20
const MAX_NOTE = 500

/**
 * DeclineOrderPage — refusing a purchase order outright.
 *
 * There is no third option: the terms of an issued order cannot be changed, so the supplier either
 * accepts it or declines it. Declining ends the order, so the reason is required and the buyer
 * reads it in full.
 */
export function DeclineOrderPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const decline = useDeclinePurchaseOrder()

  const [reason, setReason] = useState('stock_unavailable')
  const [note, setNote] = useState('')

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/supplier/orders" replace />
  // A PO already accepted, declined or cancelled is no longer refusable.
  if (order.status !== 'awaiting_acceptance') return <Navigate to={`/supplier/orders/${order.id}`} replace />

  const trimmed = note.trim()
  const valid = trimmed.length >= MIN_NOTE && trimmed.length <= MAX_NOTE
  const money = (n: number) => `SAR ${Math.round(n).toLocaleString(i18n.language)}`
  const total = orderTotals(order).total

  const consequences = ['declined', 'buyerNotified', 'loseAward'] as const

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <nav className="text-sm text-content-tertiary">
        <button
          type="button"
          onClick={() => navigate('/supplier/orders')}
          className="cursor-pointer text-content-link hover:underline"
        >
          {t('order.supplierView.title')}
        </button>
        <span className="mx-1.5">/</span>
        <button
          type="button"
          onClick={() => navigate(`/supplier/orders/${order.id}/purchase-order`)}
          className="cursor-pointer text-content-link hover:underline"
        >
          {order.poNumber}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{t('order.supplierView.decline.crumb')}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">
        {t('order.supplierView.decline.title')}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {order.poNumber} · {order.title} · {t('order.supplierView.verifiedBuyer')} · {money(total)}
      </p>


      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">{t('order.supplierView.decline.why')}</h2>
            <div className="mt-3">
              <ReasonChips
                reasons={REASONS}
                selected={reason}
                onSelect={setReason}
                labelKey="order.supplierView.decline.reason"
              />
            </div>

            <label className="mt-4 block">
              <span className="mb-1 block text-xs font-medium text-content-secondary">
                {t('order.supplierView.decline.noteLabel')}
              </span>
              <Textarea
                rows={3}
                value={note}
                maxLength={MAX_NOTE}
                onChange={(e) => setNote(e.target.value)}
                placeholder={t('order.supplierView.decline.notePlaceholder')}
              />
            </label>
            <p className="mt-2 text-xs text-content-tertiary">{t('order.supplierView.decline.noteShared')}</p>
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">
              {t('order.supplierView.decline.whatHappens')}
            </h2>
            <ol className="mt-3 space-y-2.5">
              {consequences.map((key, index) => (
                <li key={key} className="flex items-start gap-3 rounded-lg bg-bg-surface-sunken px-4 py-3">
                  <span className="mt-0.5 text-xs font-semibold text-content-tertiary">{index + 1}</span>
                  <span>
                    <span className="block text-sm font-semibold text-content-primary">
                      {t(`order.supplierView.decline.consequence.${key}.title`)}
                    </span>
                    <span className="mt-0.5 block text-xs text-content-secondary">
                      {t(`order.supplierView.decline.consequence.${key}.body`)}
                    </span>
                  </span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">{t('order.supplierView.decline.poCard')}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <SummaryRow label={t('order.supplierView.decline.reference')} value={order.poNumber} />
              <SummaryRow label={t('order.buyer')} value={t('order.supplierView.verifiedBuyer')} />
              <SummaryRow label={t('order.supplierView.col.value')} value={money(total)} />
              <SummaryRow
                label={t('order.supplierView.decline.items')}
                value={t('order.linesAgreed', { count: order.lines.length })}
              />
              <SummaryRow
                label={t('rfq.list.columns.status')}
                value={t('order.supplierView.decline.notAccepted')}
                valueClass="text-status-warning-strong"
              />
            </dl>
          </Panel>

          <Panel className="space-y-2.5">
            <Button
              fullWidth
              variant="danger"
              disabled={!valid}
              isLoading={decline.isPending}
              onClick={() =>
                decline.mutate(
                  { id: order.id, reasonTag: reason, note: trimmed },
                  { onSuccess: () => navigate('/supplier/orders') },
                )
              }
            >
              {t('order.supplierView.decline.confirm')}
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate(`/supplier/orders/${order.id}/purchase-order`)}
            >
              {t('order.supplierView.decline.goBack')}
            </Button>
            <p className="pt-1 text-xs text-content-tertiary">{t('order.supplierView.decline.cannotUndo')}</p>
          </Panel>
        </div>
      </div>
    </section>
  )
}
