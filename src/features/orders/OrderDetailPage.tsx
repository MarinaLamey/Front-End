import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { cn } from '@/shared/lib/cn'
import { useConfirmReceipt, useOrder } from './hooks/orderQueries'
import { orderTotals } from './lib'
import { OrderStatusTimeline, OrderedItemsTable, PartiesCard, StatusPill } from './components'
import { PurchaseOrderModal } from './PurchaseOrderModal'
import type { Order } from './types'

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

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      {/* Breadcrumb */}
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/orders')} className="cursor-pointer hover:text-content-secondary">
          {t('order.title')}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{s === 'awaiting_acceptance' || s === 'declined' || s === 'cancelled' ? order.poNumber : order.id}</span>
      </nav>

      {/* Chips + title */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="font-medium text-content-secondary">
          {order.id} · {order.poNumber}
        </span>
        <StatusPill order={order} />
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">{order.title}</h1>

      {/* Declined = a distinct resolution surface */}
      {s === 'declined' ? (
        <DeclinedView order={order} />
      ) : (
        <>
          {/* Banner */}
          <Banner order={order} onViewHistory={() => navigate(`/buyer/orders/${order.id}/messages`)} />

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
            {/* Main column */}
            <div className="space-y-6">
              <PartiesCard order={order} />

              {showReceipt ? (
                <ReceiptCard order={order} confirming={confirm.isPending} onConfirm={(receipt, full) => confirm.mutate({ id: order.id, receipt, full })} />
              ) : (
                (s === 'in_transit' || s === 'closed') && <ShipmentCard order={order} />
              )}

              <OrderedItemsTable order={order} />
            </div>

            {/* Right rail */}
            <div className="space-y-5">
              <OrderStatusTimeline order={order} />

              <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface p-5">
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

                {s === 'in_transit' && !recording && (
                  <>
                    <Button fullWidth onClick={() => setRecording(true)}>{t('order.action.confirmReceived')}</Button>
                    <Button fullWidth variant="outline" onClick={messages}>{t('order.action.message')}</Button>
                    <Button fullWidth variant="outline" className="!text-status-danger" onClick={() => navigate(`/buyer/orders/${order.id}/report`)}>
                      {t('order.action.reportIssue')}
                    </Button>
                    <Button fullWidth variant="outline" className="!text-status-danger" onClick={() => navigate(`/buyer/orders/${order.id}/cancel`)}>
                      {t('order.action.requestCancel')}
                    </Button>
                    <p className="pt-1 text-xs text-content-tertiary">{t('order.hint.inTransit')}</p>
                  </>
                )}

                {s === 'delivered' && (
                  <p className="text-xs text-content-tertiary">{t('order.hint.delivered')}</p>
                )}

                {s === 'closed' && (
                  <>
                    <Button fullWidth variant="outline" onClick={() => setFavourited((v) => !v)}>
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
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
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
function ReceiptCard({
  order,
  onConfirm,
  confirming,
}: {
  order: Order
  onConfirm: (receipt: Record<number, { received: number; note?: string }>, full: boolean) => void
  confirming: boolean
}) {
  const { t, i18n } = useTranslation()
  const [received, setReceived] = useState<Record<number, number>>(
    () => Object.fromEntries(order.lines.map((l, i) => [i, l.quantity])),
  )

  const shortLines = order.lines.filter((l, i) => received[i] < l.quantity)
  const anyShort = shortLines.length > 0
  const shortTotal = order.lines.reduce((sum, l, i) => sum + Math.max(0, l.quantity - received[i]), 0)

  const build = () =>
    Object.fromEntries(
      order.lines.map((l, i) => [i, { received: received[i], note: received[i] < l.quantity ? t('order.receipt.balanceToFollow') : undefined }]),
    )

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
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
        <div className="min-w-[560px]">
          <div className="grid grid-cols-[24px_minmax(0,1fr)_72px_96px_110px_minmax(0,1fr)] items-center gap-3 border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary">
            <span>#</span>
            <span>{t('order.col.description')}</span>
            <span className="text-end">{t('order.receipt.ordered')}</span>
            <span className="text-end">{t('order.receipt.received')}</span>
            <span>{t('order.receipt.condition')}</span>
            <span>{t('order.receipt.note')}</span>
          </div>
          {order.lines.map((l, i) => {
            const short = received[i] < l.quantity
            return (
              <div key={i} className="grid grid-cols-[24px_minmax(0,1fr)_72px_96px_110px_minmax(0,1fr)] items-center gap-3 border-b border-border-subtle py-2.5 text-sm">
                <span className="text-content-tertiary">{i + 1}</span>
                <span className="text-content-primary">{l.description}</span>
                <span className="text-end tabular-nums text-content-secondary">{l.quantity.toLocaleString(i18n.language)}</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={received[i]}
                  onChange={(e) => {
                    const n = Math.max(0, Math.min(l.quantity, Number(e.target.value.replace(/[^\d]/g, '')) || 0))
                    setReceived((r) => ({ ...r, [i]: n }))
                  }}
                  className={cn(
                    'w-full rounded-md border bg-bg-surface px-2 py-1 text-end text-sm tabular-nums outline-none',
                    short ? 'border-status-warning-strong text-status-warning-strong' : 'border-border-subtle text-content-primary',
                  )}
                />
                <span>
                  {short ? (
                    <span className="rounded bg-status-warning-subtle px-1.5 py-0.5 text-xs font-medium text-status-warning-strong">
                      {t('order.receipt.shortBy', { count: l.quantity - received[i] })}
                    </span>
                  ) : (
                    <span className="rounded bg-status-success-subtle px-1.5 py-0.5 text-xs font-medium text-status-success-strong">
                      {t('order.receipt.accepted')}
                    </span>
                  )}
                </span>
                <span className="truncate text-xs text-content-tertiary">{short ? t('order.receipt.balanceToFollow') : '—'}</span>
              </div>
            )
          })}
        </div>
      </div>

      {anyShort && (
        <p className="mt-3 rounded-lg bg-status-warning-subtle px-3 py-2 text-sm text-status-warning-strong">
          {t('order.receipt.shortWarning', { count: shortTotal })}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between rounded-lg border border-dashed border-border-subtle px-3 py-2.5 text-sm text-content-tertiary">
        <span>{t('order.receipt.attach')}</span>
        <button type="button" className="cursor-pointer font-medium text-content-link hover:text-content-link-hover">
          {t('order.receipt.upload')}
        </button>
      </div>

      <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
        <Button disabled={!anyShort} isLoading={confirming} onClick={() => onConfirm(build(), false)}>
          {t('order.receipt.confirmPartial')}
        </Button>
        <Button variant={anyShort ? 'outline' : 'primary'} isLoading={confirming} onClick={() => onConfirm(build(), true)}>
          {t('order.receipt.confirmFull')}
        </Button>
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
  const [choice, setChoice] = useState<'runner_up' | 'reopen' | 'close'>('runner_up')

  const options = useMemo(() => {
    const ru = order.runnerUp
    return [
      {
        key: 'runner_up' as const,
        title: t('order.resolve.runnerUp.title'),
        desc: ru
          ? t('order.resolve.runnerUp.desc', { label: ru.supplierLabel, total: money(ru.totalSar), covered: ru.itemsCovered, total_items: ru.itemsTotal, date: new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(ru.validUntil)) })
          : t('order.resolve.runnerUp.none'),
        disabled: !ru,
      },
      { key: 'reopen' as const, title: t('order.resolve.reopen.title'), desc: t('order.resolve.reopen.desc') },
      { key: 'close' as const, title: t('order.resolve.close.title'), desc: t('order.resolve.close.desc') },
    ]
  }, [order.runnerUp, t, i18n.language])

  const confirmChoice = () => {
    if (choice === 'reopen') navigate(`/buyer/rfqs/${order.rfqId}`)
    else navigate('/buyer/orders')
  }

  return (
    <>
      <div className="mt-4 rounded-xl bg-status-danger-subtle p-5">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-status-danger px-2 py-0.5 text-xs font-semibold text-white">{t('order.status.declined')}</span>
          <span className="text-content-secondary">{order.poNumber} · {t('order.declined.voided', { date: new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.declinedAt ?? order.issuedAt)) })}</span>
        </div>
        <h2 className="mt-3 text-xl font-bold tracking-tight text-content-primary">{t('order.declined.heading', { supplier: order.supplier.name })}</h2>
        <p className="mt-1 text-sm text-content-secondary">{t('order.declined.sub', { rfq: order.rfqReference })}</p>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          {/* Reason */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
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

          {/* Resolution choices */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <h3 className="text-sm font-semibold text-content-primary">{t('order.resolve.title')}</h3>
            <div className="mt-3 space-y-3">
              {options.map((o) => (
                <label
                  key={o.key}
                  className={cn(
                    'flex cursor-pointer gap-3 rounded-xl border p-4',
                    o.disabled && 'cursor-not-allowed opacity-50',
                    choice === o.key ? 'border-brand-primary bg-brand-subtle' : 'border-border-subtle',
                  )}
                >
                  <input
                    type="radio"
                    name="resolve"
                    className="mt-1 h-4 w-4 accent-brand-primary"
                    checked={choice === o.key}
                    disabled={o.disabled}
                    onChange={() => setChoice(o.key)}
                  />
                  <span>
                    <span className={cn('block text-sm font-semibold', choice === o.key ? 'text-brand-primary' : 'text-content-primary')}>{o.title}</span>
                    <span className="mt-0.5 block text-sm text-content-secondary">{o.desc}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <h3 className="text-sm font-semibold text-content-primary">{t('order.declined.voidedPo')}</h3>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('order.po.reference')} value={order.poNumber} />
              <Row label={t('order.supplier')} value={order.supplierShort} />
              <Row label={t('order.declined.value')} value={money(orderTotals(order).total)} />
              <Row label={t('order.ship.status')} value={t('order.status.void')} valueClass="font-semibold text-status-danger" />
            </dl>
            <p className="mt-3 text-xs text-content-tertiary">{t('order.declined.noExposure')}</p>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface p-5">
            <Button fullWidth onClick={confirmChoice}>{t('order.resolve.confirm')}</Button>
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
