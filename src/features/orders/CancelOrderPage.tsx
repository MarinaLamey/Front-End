import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { cn } from '@/shared/lib/cn'
import { useRfq } from '@/features/rfq/hooks/rfqQueries'
import { useCancelOrder, useOrder } from './hooks/orderQueries'
import { orderTotals, supplierDisplayName } from './lib'

const REASONS = ['no_longer_required', 'budget_withdrawn', 'sourcing_error', 'better_offer', 'supplier_unresponsive', 'other']

export function CancelOrderPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const cancel = useCancelOrder()

  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const { data: rfq } = useRfq(order?.rfqId ?? '')
  const partlyAwarded = rfq?.status === 'partially_awarded'

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/buyer/orders" replace />
  // SoT §12: a cancellation may be asked for ONLY while the order is Awaiting supplier. Once the
  // supplier accepts, neither side can cancel — the order runs to fulfilment, delivery and close.
  if (order.status !== 'awaiting_acceptance') {
    return <Navigate to={`/buyer/orders/${order.id}`} replace />
  }

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const preAcceptance = order.status === 'awaiting_acceptance'
  const canCancel = reason.length > 0 && note.trim().length > 0

  const doCancel = () =>
    cancel.mutate(
      { id: order.id, reason, note: note.trim() },
      { onSuccess: () => navigate(`/buyer/orders/${order.id}`) },
    )

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/orders')} className="cursor-pointer hover:text-content-secondary">{t('order.title')}</button>
        <span className="mx-1.5">/</span>
        <button type="button" onClick={() => navigate(`/buyer/orders/${order.id}`)} className="cursor-pointer hover:text-content-secondary">{order.poNumber}</button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{t('order.cancel.crumb')}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">{t('order.cancel.heading')}</h1>
      <p className="mt-1 text-sm text-content-secondary">{order.poNumber} · {order.title} · {money(orderTotals(order).total)}</p>

      <div className={cn('mt-4 rounded-xl px-4 py-3 text-sm', preAcceptance ? 'bg-status-success-subtle text-status-success-strong' : 'bg-status-warning-subtle text-status-warning-strong')}>
        {preAcceptance ? t('order.cancel.bannerDirect') : t('order.cancel.bannerAgreement')}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="auth-stagger space-y-6">
          {/* Reason */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.cancel.whyTitle')}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    'mp-press rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    reason === r ? 'border-brand-primary bg-brand-subtle text-brand-primary' : 'border-border-subtle text-content-secondary hover:text-content-primary',
                  )}
                >
                  {t(`order.cancel.reason.${r}`)}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium text-content-secondary">{t('order.cancel.noteLabel')}</label>
            <Textarea rows={3} className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('order.cancel.notePlaceholder')} />
            <p className="mt-2 text-xs text-content-tertiary">{t('order.cancel.noteHint')}</p>
          </div>

          {/* What happens to the RFQ. SoT §9: not a choice — the route follows the request's award
              state. A partly awarded request returns to Live keeping its number and its bids; a
              fully awarded one is finished, and the buyer starts a new request with a new number. */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.cancel.rfqTitle', { rfq: order.rfqReference })}</h2>
            <div className="mt-3 rounded-xl border border-border-subtle bg-bg-surface-sunken p-4">
              <p className="text-sm font-semibold text-content-primary">
                {partlyAwarded
                  ? t('order.resolve.partlyAwarded.title', { rfq: order.rfqReference })
                  : t('order.resolve.fullyAwarded.title')}
              </p>
              <p className="mt-0.5 text-sm text-content-secondary">
                {partlyAwarded
                  ? t('order.resolve.partlyAwarded.desc')
                  : t('order.resolve.fullyAwarded.desc', { rfq: order.rfqReference })}
              </p>
            </div>
          </div>
        </div>

        {/* Right rail */}
        <div className="auth-stagger space-y-5">
          <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.po.summaryTitle')}</h2>
            {/* No PO-reference row — the page sub-heading already opens with the PO number. */}
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('order.supplier')} value={supplierDisplayName(order)} />
              <Row label={t('order.po.total')} value={money(orderTotals(order).total)} />
              <Row label={t('order.issuedLabel')} value={dateFull(order.issuedAt)} />
              <Row label={t('order.ship.status')} value={preAcceptance ? t('order.status.awaitingLong') : t('order.status.inTransit')} valueClass="font-semibold text-status-warning-strong" />
            </dl>
            <p className="mt-3 text-xs text-content-tertiary">{preAcceptance ? t('order.cancel.noConsequence') : t('order.cancel.agreementNote')}</p>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <Button variant="danger" fullWidth disabled={!canCancel} isLoading={cancel.isPending} onClick={doCancel}>
              {t('order.cancel.confirm')}
            </Button>
            <Button variant="outline" fullWidth onClick={() => navigate(`/buyer/orders/${order.id}`)}>{t('order.cancel.keep')}</Button>
            <p className="pt-1 text-xs text-content-tertiary">{t('order.cancel.undoneNote')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className={valueClass ?? 'font-medium text-content-primary'}>{value}</dd>
    </div>
  )
}
