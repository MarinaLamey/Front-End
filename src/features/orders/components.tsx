import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { isSupplierRevealed, orderTotals, paymentSchedule, statusMeta, supplierDisplayName, timeline, type StatusTone } from './lib'
import type { Order } from './types'

const TONE: Record<StatusTone, string> = {
  warning: 'bg-status-warning-subtle text-status-warning-strong',
  info: 'bg-status-info-subtle text-status-info',
  success: 'bg-status-success-subtle text-status-success-strong',
  danger: 'bg-status-danger-subtle text-status-danger',
  neutral: 'bg-bg-surface-sunken text-content-secondary',
}

/** A coloured status chip for an order. */
export function StatusPill({ order, className }: { order: Order; className?: string }) {
  const { t } = useTranslation()
  const meta = statusMeta(order.status)
  return (
    <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', TONE[meta.tone], className)}>
      {t(meta.key)}
    </span>
  )
}

/** Buyer + supplier identity, side by side. The supplier is anonymized until they accept the PO. */
export function PartiesCard({ order }: { order: Order }) {
  const { t } = useTranslation()
  const Party = ({ label, p }: { label: string; p: Order['buyer'] }) => (
    <div>
      <p className="text-xs font-medium text-content-tertiary">{label}</p>
      <p className="mt-1 text-sm font-bold text-content-primary">{p.name}</p>
      <p className="mt-0.5 text-xs text-content-tertiary">CR {p.cr} · VAT {p.vat}</p>
      <p className="text-xs text-content-tertiary">{p.location}</p>
    </div>
  )
  return (
    <div className="grid gap-6 rounded-xl border border-border-subtle bg-bg-surface p-5 sm:grid-cols-2">
      <Party label={t('order.buyer')} p={order.buyer} />
      {isSupplierRevealed(order) ? (
        <Party label={t('order.supplier')} p={order.supplier} />
      ) : (
        <div>
          <p className="text-xs font-medium text-content-tertiary">{t('order.supplier')}</p>
          <p className="mt-1 text-sm font-bold text-content-primary">{supplierDisplayName(order)}</p>
          <p className="mt-0.5 text-xs text-content-tertiary">{t('order.supplierRevealOnAccept')}</p>
          <p className="text-xs text-content-tertiary">{t('order.supplierRevealShort')}</p>
        </div>
      )}
    </div>
  )
}

/** Agreed line items with a per-line delivery date and the VAT breakdown (Subtotal + VAT 15% + Total). */
export function OrderedItemsTable({ order }: { order: Order }) {
  const { t, i18n } = useTranslation()
  const { subtotal, vat, total } = orderTotals(order)
  const money = (n: number) => `SAR ${n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const GRID = 'grid grid-cols-[22px_minmax(0,1fr)_58px_40px_74px_92px_100px] items-center gap-3'
  const fallbackDelivery = order.shipment.expectedArrival ?? order.shipment.deliveredAt

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-primary">{t('order.orderedItems')}</h2>
        <span className="text-xs text-content-tertiary">{t('order.linesAgreed', { count: order.lines.length })}</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[620px]">
          <div className={cn(GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
            <span>#</span>
            <span>{t('order.col.description')}</span>
            <span className="text-end">{t('order.col.qty')}</span>
            <span>{t('order.col.unit')}</span>
            <span className="text-end">{t('order.col.unitPrice')}</span>
            <span className="text-end">{t('order.col.lineTotal')}</span>
            <span>{t('order.col.delivery')}</span>
          </div>
          {order.lines.map((l, i) => (
            <div key={i} className={cn(GRID, 'border-b border-border-subtle py-2.5 text-sm')}>
              <span className="text-content-tertiary">{i + 1}</span>
              <span className="text-content-primary">{l.description}</span>
              <span className="text-end tabular-nums text-content-secondary">{l.quantity.toLocaleString(i18n.language)}</span>
              <span className="text-content-tertiary">{l.unit}</span>
              <span className="text-end tabular-nums text-content-secondary">{l.unitPriceSar.toFixed(2)}</span>
              <span className="text-end font-semibold tabular-nums text-content-primary">
                {(l.quantity * l.unitPriceSar).toLocaleString(i18n.language, { minimumFractionDigits: 2 })}
              </span>
              <span className="text-sm font-medium tabular-nums text-content-primary">{dateFull(l.deliveryDate ?? fallbackDelivery)}</span>
            </div>
          ))}
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-content-secondary">{t('order.subtotal')}</dt>
              <dd className="font-semibold tabular-nums text-content-primary">{money(subtotal)}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-content-secondary">{t('order.vat')}</dt>
              <dd className="font-semibold tabular-nums text-content-primary">{money(vat)}</dd>
            </div>
            <div className="flex items-center justify-between border-t border-border-subtle pt-2">
              <dt className="font-semibold text-content-primary">{t('order.poTotal')}</dt>
              <dd className="font-bold tabular-nums text-content-link">{money(total)}</dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}

/** The PO payment schedule (# · Trigger · % · Amount), carried from the agreed offer. Hidden when the
 *  terms don't resolve to percentage milestones (e.g. "Monthly"). */
export function PaymentScheduleCard({ order }: { order: Order }) {
  const { t, i18n } = useTranslation()
  const rows = paymentSchedule(order)
  if (rows.length === 0) return null
  const { total } = orderTotals(order)
  const money = (n: number) => `SAR ${n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const GRID = 'grid grid-cols-[22px_minmax(0,1fr)_64px_120px] items-center gap-3'

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-primary">{t('order.schedule.title')}</h2>
        <span className="text-xs text-content-tertiary">
          {t('order.schedule.count', { count: rows.length, version: order.offerVersion })}
        </span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[420px]">
          <div className={cn(GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
            <span>#</span>
            <span>{t('order.schedule.trigger')}</span>
            <span>{t('order.schedule.percent')}</span>
            <span>{t('order.schedule.amount')}</span>
          </div>
          {rows.map((r, i) => (
            <div key={r.trigger + i} className={cn(GRID, 'border-b border-border-subtle py-2.5 text-sm')}>
              <span className="text-content-tertiary">{i + 1}</span>
              <span className="text-content-primary">{t(`order.trigger.${r.trigger}`)}</span>
              <span className="tabular-nums text-content-secondary">{r.percent}%</span>
              <span className="font-medium tabular-nums text-content-primary">{money(r.amount)}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-3 text-xs text-content-tertiary">
        {t('order.schedule.carried', { version: order.offerVersion, total: money(total) })}
      </p>
    </div>
  )
}

const DOT: Record<string, string> = {
  done: 'bg-status-success',
  current: 'bg-status-warning-strong',
  pending: 'bg-border-strong',
  void: 'bg-status-danger',
}

/** Right-rail vertical lifecycle timeline. */
export function OrderStatusTimeline({ order }: { order: Order }) {
  const { t, i18n } = useTranslation()
  const steps = timeline(order)
  const stamp = (iso?: string) =>
    iso
      ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(iso))
      : undefined
  /** Day + month only — the "Expected 25 Aug" note is a glance, not a precise stamp. */
  const shortDate = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso)) : ''

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
      <h2 className="text-sm font-semibold text-content-primary">{t('order.statusTitle')}</h2>
      <ol className="mp-stagger mt-4 space-y-4">
        {steps.map((step, i) => (
          <li key={step.key} className="grid grid-cols-[16px_minmax(0,1fr)] gap-3">
            <div className="flex flex-col items-center">
              <span className={cn('mt-1 h-2.5 w-2.5 rounded-full', DOT[step.state])} />
              {i < steps.length - 1 && <span className="mt-1 w-px flex-1 bg-border-subtle" />}
            </div>
            <div className="pb-1">
              <p className={cn('text-sm font-medium', step.state === 'pending' ? 'text-content-tertiary' : 'text-content-primary')}>
                {t(`order.step.${step.key}`)}
              </p>
              {step.at ? (
                <p className="mt-0.5 text-xs text-content-tertiary">{stamp(step.at)}</p>
              ) : step.noteKey ? (
                <p className="mt-0.5 text-xs text-content-tertiary">{t(step.noteKey, { date: shortDate(step.noteDate) })}</p>
              ) : (
                <p className="mt-0.5 text-xs text-content-tertiary">{t('order.timeline.notStarted')}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}
