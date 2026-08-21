import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StarIcon } from '@/shared/ui/dashboard'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { cn } from '@/shared/lib/cn'
import { useRfq } from '@/features/rfq/hooks/rfqQueries'
import { useConfirmReceipt, useOrder } from './hooks/orderQueries'
import { orderTotals, statusMeta, supplierDisplayName } from './lib'
import { OrderStatusTimeline, OrderedItemsTable, PartiesCard, PaymentScheduleCard } from './components'
import { PurchaseOrderModal } from './PurchaseOrderModal'
import type { Order, OrderStatus } from './types'

/**
 * The detail header carries a tinted PILL, using the same tone scale as the list chip but with the
 * longer, contextual label ("Delivered · confirm receipt" rather than "Delivered"). `neutral` maps
 * to the warning tint on purpose: an unaccepted PO is waiting on someone, not idle.
 */
const DETAIL_TONE: Record<string, string> = {
  warning: 'bg-status-warning-subtle text-status-warning-strong',
  info: 'bg-status-info-subtle text-status-info',
  success: 'bg-status-success-subtle text-status-success-strong',
  danger: 'bg-status-danger-subtle text-status-danger',
  neutral: 'bg-status-warning-subtle text-status-warning-strong',
}
const DETAIL_STATUS_KEY: Record<OrderStatus, string> = {
  awaiting_acceptance: 'order.detailStatus.awaiting',
  accepted_awaiting_dispatch: 'order.detailStatus.acceptedAwaitingDispatch',
  in_transit: 'order.detailStatus.inTransit',
  delivered: 'order.detailStatus.delivered',
  closed: 'order.detailStatus.closed',
  cancelled: 'order.detailStatus.cancelled',
  declined: 'order.detailStatus.declined',
  expired: 'order.detailStatus.expired',
}

export function OrderDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const confirm = useConfirmReceipt()

  const [poOpen, setPoOpen] = useState(false)
  const [recording, setRecording] = useState(false)
  const [favourited, setFavourited] = useState(false)

  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/buyer/orders" replace />

  const s = order.status
  const showReceipt = s === 'delivered' || (s === 'in_transit' && recording)
  const messages = () => navigate(`/buyer/orders/${order.id}/messages`)

  /**
   * SoT §11: a delivery is accepted IN FULL or it is not accepted. There is no partial receipt, no
   * editable received quantity and no reject action — anything short is settled between the two
   * companies off the platform in this phase. So the receipt is one button over a read-only table,
   * and every line is recorded as received in full.
   */
  const confirmReceipt = () =>
    confirm.mutate({
      id: order.id,
      receipt: Object.fromEntries(order.lines.map((l, i) => [i, { received: l.quantity }])),
      full: true,
    })

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      {/* Breadcrumb */}
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/orders')} className="cursor-pointer hover:text-content-secondary">
          {t('order.title')}
        </button>
        <span className="mx-1.5">/</span>
        {/* Always the PO number: it is the reference both sides quote, and the frames use it at
            every status. The internal order id is not a thing the buyer has ever been shown. */}
        <span className="text-content-secondary">{order.poNumber}</span>
      </nav>

      {/* Status pill + title. The declined surface owns its own heading, so neither renders here —
          the red panel below IS that screen's title block. */}
      {s !== 'declined' && (
        <>
          <div className="mt-3">
            <span className={cn('inline-flex rounded-full px-2.5 py-1 text-xs font-semibold', DETAIL_TONE[statusMeta(s).tone])}>
              {t(DETAIL_STATUS_KEY[s])}
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">{order.title}</h1>
        </>
      )}

      {/* Declined = a distinct resolution surface */}
      {s === 'declined' ? (
        <DeclinedView order={order} />
      ) : (
        <>
          {/* Banner */}
          <Banner order={order} onViewHistory={() => navigate(`/buyer/orders/${order.id}/messages`)} />

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Main column */}
            <div className="auth-stagger space-y-6">
              <PartiesCard order={order} />

              {showReceipt ? (
                <ReceiptCard order={order} />
              ) : (
                (s === 'in_transit' || s === 'closed') && <ShipmentCard order={order} />
              )}

              <OrderedItemsTable order={order} />

              <PaymentScheduleCard order={order} />
            </div>

            {/* Right rail */}
            <div className="space-y-5">
              <OrderStatusTimeline order={order} />

              <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
                {s === 'awaiting_acceptance' && (
                  <>
                    <Button fullWidth onClick={() => setPoOpen(true)}>{t('order.action.downloadPo')}</Button>
                    <Button fullWidth variant="outline" onClick={messages}>{t('order.action.message')}</Button>
                    <Button fullWidth variant="outline" className="!text-status-danger" onClick={() => navigate(`/buyer/orders/${order.id}/cancel`)}>
                      {t('order.action.cancelPo')}
                    </Button>
                    <p className="pt-1 text-xs text-content-tertiary">{t('order.hint.awaiting')}</p>
                  </>
                )}

                {/* SoT §11 + §12: no "report an issue" (the whole dispute flow is phase 2) and no
                    cancellation once the supplier has accepted — an accepted order runs to
                    fulfilment, delivery and close, and neither side can cancel it. */}
                {s === 'in_transit' && !recording && (
                  <>
                    <Button fullWidth onClick={() => setRecording(true)}>{t('order.action.confirmReceived')}</Button>
                    <Button fullWidth variant="outline" onClick={messages}>{t('order.action.message')}</Button>
                    <p className="pt-1 text-xs text-content-tertiary">{t('order.hint.inTransit')}</p>
                  </>
                )}

                {showReceipt && (
                  <>
                    <Button fullWidth isLoading={confirm.isPending} onClick={confirmReceipt}>
                      {t('order.receipt.confirmFull')}
                    </Button>
                    <Button fullWidth variant="outline" onClick={messages}>{t('order.action.message')}</Button>
                    <p className="pt-1 text-xs text-content-tertiary">{t('order.hint.delivered')}</p>
                  </>
                )}

                {s === 'closed' && (
                  <>
                    <Button
                      fullWidth
                      variant="outline"
                      leftIcon={<StarIcon className="h-4 w-4" />}
                      onClick={() => setFavourited((v) => !v)}
                    >
                      {favourited ? t('order.action.favourited') : t('order.action.favourite')}
                    </Button>
                    <Button fullWidth variant="outline" onClick={messages}>{t('order.action.message')}</Button>
                    <Button fullWidth variant="outline" onClick={() => setPoOpen(true)}>{t('order.action.viewPo')}</Button>
                    <p className="pt-1 text-xs text-content-tertiary">{t('order.hint.closed')}</p>
                  </>
                )}

                {s === 'cancelled' && (
                  <>
                    <Button fullWidth variant="outline" onClick={() => setPoOpen(true)}>{t('order.action.viewPo')}</Button>
                    <p className="pt-1 text-xs text-content-tertiary">
                      {t('order.cancelledOn', { date: dateFull(order.cancelledAt) })}
                    </p>
                  </>
                )}
              </div>
            </div>
          </div>
        </>
      )}

      <PurchaseOrderModal order={order} open={poOpen} onClose={() => setPoOpen(false)} />
    </section>
  )
}

/* ── Banner ─────────────────────────────────────────────────────────────────── */
function Banner({ order, onViewHistory }: { order: Order; onViewHistory: () => void }) {
  const { t, i18n } = useTranslation()
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const dateShort = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso)) : '—'

  const text = () => {
    switch (order.status) {
      case 'awaiting_acceptance':
        return t('order.banner.awaiting', { version: order.offerVersion, rfq: order.rfqReference, rounds: order.offerVersion })
      case 'in_transit':
        return t('order.banner.inTransit', { version: order.offerVersion, rfq: order.rfqReference, date: dateShort(order.acceptedAt) })
      case 'delivered':
        return t('order.banner.delivered', { date: dateShort(order.shipment.deliveredAt) })
      case 'closed':
        return t('order.banner.closed', { date: dateFull(order.closedAt), version: order.offerVersion, rfq: order.rfqReference })
      case 'cancelled':
        return t('order.banner.cancelled', { date: dateFull(order.cancelledAt) })
      default:
        return ''
    }
  }
  const tone = order.status === 'delivered' ? 'bg-status-warning-subtle text-status-warning-strong' : 'bg-brand-subtle text-content-secondary'

  return (
    <div className={cn('mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl px-4 py-3', tone)}>
      <p className="text-sm">{text()}</p>
      <Button size="sm" variant="outline" onClick={onViewHistory}>{t('order.viewHistory')}</Button>
    </div>
  )
}

/* ── Shipment ───────────────────────────────────────────────────────────────── */
function ShipmentCard({ order }: { order: Order }) {
  const { t, i18n } = useTranslation()
  const dateTime = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) : '—'
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const statusText = order.status === 'closed' ? t('order.ship.deliveredConfirmed') : t('order.ship.inTransit')

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
      <h2 className="text-sm font-semibold text-content-primary">{t('order.ship.title')}</h2>
      <dl className="mt-3 space-y-2.5 text-sm">
        <Row label={t('order.ship.status')} value={statusText} valueClass="font-semibold text-content-link" />
        <Row label={t('order.ship.dispatched')} value={dateTime(order.shipment.dispatchedAt)} />
        <Row label={t('order.ship.expected')} value={dateFull(order.shipment.expectedArrival)} />
        <Row label={t('order.ship.method')} value={order.shipment.method ?? '—'} />
        <Row label={t('order.ship.reference')} value={order.shipment.reference ?? '—'} />
        <Row label={t('order.ship.deliverTo')} value={order.shipment.deliverTo ?? '—'} />
      </dl>
      <p className="mt-3 text-xs text-content-tertiary">{t('order.ship.note')}</p>
    </div>
  )
}

/* ── Receipt recording ──────────────────────────────────────────────────────── */
/**
 * What the buyer is confirming they received. SoT §11: a delivery is accepted IN FULL or it is not
 * accepted, so this table is READ ONLY — no editable received quantity, no partial receipt, no
 * reject action, and no shortfall arithmetic. Anything short is settled between the two companies
 * off the platform in this phase. The buyer's job here is to check the delivery against the order
 * and then confirm, which is the single event that closes it.
 */
function ReceiptCard({ order }: { order: Order }) {
  const { t, i18n } = useTranslation()
  const money = (n: number) => `SAR ${n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const fallbackDelivery = order.shipment.expectedArrival ?? order.shipment.deliveredAt
  const valueReceived = order.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceSar, 0)
  const GRID = 'grid grid-cols-[20px_minmax(0,1.3fr)_64px_64px_minmax(0,0.9fr)_92px] items-center gap-3'

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-primary">{t('order.receipt.title')}</h2>
        {order.shipment.deliveredAt && (
          <span className="text-xs text-content-tertiary">
            {t('order.receipt.deliveredRef', {
              date: new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(order.shipment.deliveredAt)),
              ref: order.shipment.reference ?? '—',
            })}
          </span>
        )}
      </div>

      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[720px]">
          <div className={cn(GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
            <span>#</span>
            <span>{t('order.col.description')}</span>
            <span className="text-end">{t('order.receipt.ordered')}</span>
            <span className="text-end">{t('order.col.unit')}</span>
            <span>{t('order.col.delivery')}</span>
            <span className="text-end">{t('order.receipt.value')}</span>
          </div>
          {order.lines.map((l, i) => (
            <div key={i} className={cn(GRID, 'border-b border-border-subtle py-2.5 text-sm')}>
              <span className="text-content-tertiary">{i + 1}</span>
              <span className="text-content-primary">{l.description}</span>
              <span className="text-end tabular-nums text-content-secondary">{l.quantity.toLocaleString(i18n.language)}</span>
              <span className="text-end text-content-tertiary">{l.unit}</span>
              <span className="tabular-nums text-content-secondary">{dateFull(l.deliveryDate ?? fallbackDelivery)}</span>
              <span className="text-end font-medium tabular-nums text-content-primary">
                {(l.quantity * l.unitPriceSar).toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between gap-3">
              <dt className="text-content-secondary">{t('order.receipt.valueReceived')}</dt>
              <dd className="font-semibold tabular-nums text-content-primary">{money(valueReceived)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-border-subtle px-3 py-2.5 text-sm text-content-tertiary">
        <span>{t('order.receipt.attach')}</span>
        <button type="button" className="cursor-pointer font-medium text-content-link hover:text-content-link-hover">
          {t('order.receipt.upload')}
        </button>
      </div>
    </div>
  )
}

/* ── Declined resolution ────────────────────────────────────────────────────── */
function DeclinedView({ order }: { order: Order }) {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateTime = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso)) : '—'
  // SoT §9: the buyer is not offered a choice. The route is decided by the request's award state at
  // the moment the order failed — fully awarded means every other bid was already closed and none
  // can be revived, so the only way forward is a new request; partly awarded keeps the request and
  // its bids and simply returns it to Live.
  const { data: rfq } = useRfq(order.rfqId)
  const partlyAwarded = rfq?.status === 'partially_awarded'
  const route = partlyAwarded
    ? {
        title: t('order.resolve.partlyAwarded.title', { rfq: order.rfqReference }),
        desc: t('order.resolve.partlyAwarded.desc'),
        action: t('order.resolve.partlyAwarded.action'),
        go: () => navigate(`/buyer/rfqs/${order.rfqId}/compare`),
      }
    : {
        title: t('order.resolve.fullyAwarded.title'),
        desc: t('order.resolve.fullyAwarded.desc', { rfq: order.rfqReference }),
        action: t('order.resolve.fullyAwarded.action'),
        go: () => navigate('/buyer/rfqs/new'),
      }

  return (
    <>
      <div className="mt-4 rounded-xl bg-status-danger-subtle p-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-status-danger px-2 py-0.5 text-xs font-semibold text-white">{t('order.status.declined')}</span>
          <span className="text-content-secondary">{order.poNumber} · {t('order.declined.declinedOn', { date: new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.declinedAt ?? order.issuedAt)) })}</span>
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-content-primary">{t('order.declined.heading', { supplier: supplierDisplayName(order) })}</h2>
        <p className="mt-1 text-sm text-content-secondary">{t('order.declined.sub', { rfq: order.rfqReference })}</p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="auth-stagger space-y-6">
          {/* Reason */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-content-primary">{t('order.declined.reasonTitle')}</h3>
              {order.declineReasonTag && (
                <span className="rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-medium text-content-secondary">
                  {t(`order.declined.tag.${order.declineReasonTag}`)}
                </span>
              )}
            </div>
            <p className="mt-3 rounded-lg bg-bg-surface-sunken px-4 py-3 text-sm text-content-secondary">{order.declineReason}</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('order.declined.by')} value={order.declinedByName ?? '—'} />
              <Row label={t('order.declined.on')} value={dateTime(order.declinedAt)} />
              {order.declineHeldHours != null && <Row label={t('order.declined.held')} value={t('order.declined.heldValue', { count: order.declineHeldHours })} />}
            </dl>
          </div>

          {/* What happens next — one route, not a choice. */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <h3 className="text-sm font-semibold text-content-primary">{t('order.resolve.title')}</h3>
            <div className="mt-3 rounded-xl border border-border-subtle bg-bg-surface-sunken p-4">
              <p className="text-sm font-semibold text-content-primary">{route.title}</p>
              <p className="mt-0.5 text-sm text-content-secondary">{route.desc}</p>
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <h3 className="text-sm font-semibold text-content-primary">{t('order.declined.declinedPo')}</h3>
            {/* No PO-reference row: the red panel above already names the PO, so repeating it here
                just pads the card. */}
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('order.supplier')} value={supplierDisplayName(order)} />
              <Row label={t('order.declined.value')} value={money(orderTotals(order).total)} />
              {/* SoT §2.2 — the four endings are Closed, Cancelled, Declined and Expired. "Void" is
                  not a word this product uses. */}
              <Row label={t('order.ship.status')} value={t('order.status.declinedStatus')} valueClass="font-semibold text-status-danger" />
            </dl>
            <p className="mt-3 text-xs text-content-tertiary">{t('order.declined.noExposure')}</p>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <Button fullWidth onClick={route.go}>{route.action}</Button>
            <Button fullWidth variant="outline" onClick={() => navigate(`/buyer/rfqs/${order.rfqId}`)}>{t('order.resolve.viewRfq')}</Button>
            <p className="pt-1 text-xs text-content-tertiary">{t('order.declined.notBlocked')}</p>
          </div>
        </div>
      </div>
    </>
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
