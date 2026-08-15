import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { useAnswerCancellation, useOrder } from '../hooks/orderQueries'
import { orderTotals } from '../lib'
import { OrderNote, Panel, SummaryRow } from './components'
import { awaitingCancellationAnswer } from './supplierOrders'

/**
 * CancellationRequestPage — the buyer wants to withdraw an order the supplier has NOT yet accepted.
 *
 * A cancellation can only be asked for before acceptance (SoT §12): the buyer requests, the supplier
 * consents, and the order is then Cancelled. Nothing changes while the request is unanswered — the
 * order carries on, and if the supplier does not consent they may still accept or decline it as
 * normal. Once an order has been accepted neither side can cancel, which is why this page is
 * reachable only from the awaiting-acceptance state.
 */
export function CancellationRequestPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const answer = useAnswerCancellation()

  const dateStamp = (iso?: string) =>
    iso
      ? new Intl.DateTimeFormat(i18n.language, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(iso))
      : '—'
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

  const request = order.cancellationRequest
  // A request that has been answered — or that sits on an order already accepted, where it can no
  // longer apply — is spent: send the supplier to the order itself rather than a dead decision.
  if (!request || !awaitingCancellationAnswer(order)) {
    return <Navigate to={`/supplier/orders/${order.id}`} replace />
  }

  const money = (n: number) => `SAR ${Math.round(n).toLocaleString(i18n.language)}`
  const total = orderTotals(order).total

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <button
        type="button"
        onClick={() => navigate('/supplier/orders')}
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

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="text-xs text-content-tertiary">{order.poNumber}</span>
        <StatusBadge
          label={t('order.supplierView.status.cancellationRequested')}
          tone="warning"
          dot={false}
        />
      </div>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-content-primary">
        {t('order.supplierView.cancellation.title')}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {order.title} · {t('order.supplierView.verifiedBuyer')} ·{' '}
        {t('order.supplierView.cancellation.issuedOn', { date: dateFull(order.issuedAt) })}
      </p>

      <div className="mt-4">
        <OrderNote tone="warning">{t('order.supplierView.cancellation.banner')}</OrderNote>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Panel>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-content-primary">
                {t('order.supplierView.cancellation.reasonTitle')}
              </h2>
              <span className="rounded-full bg-bg-surface-sunken px-2.5 py-0.5 text-xs font-medium text-content-secondary">
                {t(`order.supplierView.cancellation.reason.${request.reasonTag}`)}
              </span>
            </div>
            <p className="mt-3 rounded-lg bg-bg-surface-sunken px-4 py-3 text-sm leading-relaxed text-content-secondary">
              {request.note}
            </p>
            <dl className="mt-4 space-y-2.5 text-sm">
              <SummaryRow
                label={t('order.supplierView.cancellation.requestedBy')}
                value={request.requestedByName}
              />
              <SummaryRow
                label={t('order.supplierView.cancellation.requestedOn')}
                value={dateStamp(request.requestedAt)}
              />
            </dl>
          </Panel>

          {/* Nothing has been produced or dispatched yet — this order was never accepted — so what
              matters is simply what is being withdrawn. */}
          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">
              {t('order.supplierView.cancellation.whereTitle')}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-content-secondary">
              {t('order.supplierView.cancellation.whereBody')}
            </p>
            <dl className="mt-4 space-y-2.5 text-sm">
              <SummaryRow
                label={t('rfq.list.columns.status')}
                value={t('order.supplierView.status.toReview')}
                valueClass="text-status-warning-strong"
              />
              <SummaryRow
                label={t('order.supplierView.cancellation.issued')}
                value={dateFull(order.issuedAt)}
              />
              <SummaryRow label={t('order.supplierView.cancellation.orderValue')} value={money(total)} />
              <SummaryRow
                label={t('order.supplierView.cancellation.paymentTerms')}
                value={order.paymentTermsLabel}
              />
            </dl>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel className="space-y-2.5">
            <Button
              fullWidth
              isLoading={answer.isPending}
              onClick={() =>
                answer.mutate(
                  { id: order.id, outcome: 'agreed' },
                  { onSuccess: () => navigate('/supplier/orders') },
                )
              }
            >
              {t('order.supplierView.cancellation.agree')}
            </Button>
            <Button
              fullWidth
              variant="outline"
              isLoading={answer.isPending}
              onClick={() => answer.mutate({ id: order.id, outcome: 'declined' })}
            >
              {t('order.supplierView.cancellation.decline')}
            </Button>
            <Button
              fullWidth
              variant="outline"
              onClick={() => navigate(`/supplier/orders/${order.id}/conversation`)}
            >
              {t('order.supplierView.cancellation.discuss')}
            </Button>
            <p className="pt-1 text-xs text-content-tertiary">
              {t('order.supplierView.cancellation.declineNote')}
            </p>
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">
              {t('order.supplierView.cancellation.supportTitle')}
            </h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <SummaryRow
                label={t('order.supplierView.cancellation.supportEmail')}
                value="support@mimony.sa"
              />
              <SummaryRow
                label={t('order.supplierView.cancellation.supportHours')}
                value={t('order.supplierView.cancellation.supportHoursValue')}
              />
            </dl>
          </Panel>
        </div>
      </div>
    </section>
  )
}
