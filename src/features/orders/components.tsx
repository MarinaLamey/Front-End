import { useTranslation } from 'react-i18next'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { cn } from '@/shared/lib/cn'
import { orderTotals, statusMeta, timeline, type StatusTone } from './lib'
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

/** Buyer + supplier identity, side by side. */
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
      <Party label={t('order.supplier')} p={order.supplier} />
    </div>
  )
}

/** Agreed line items with subtotal / VAT / total. */
export function OrderedItemsTable({ order }: { order: Order }) {
  const { t, i18n } = useTranslation()
  const { subtotal, vat, total } = orderTotals(order)
  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const GRID = 'grid grid-cols-[24px_minmax(0,1fr)_72px_56px_88px_110px] items-center gap-3'

  return (
    <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-content-primary">{t('order.orderedItems')}</h2>
        <span className="text-xs text-content-tertiary">{t('order.linesAgreed', { count: order.lines.length })}</span>
      </div>
      <div className="mt-3 overflow-x-auto">
        <div className="min-w-[560px]">
          <div className={cn(GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
            <span>#</span>
            <span>{t('order.col.description')}</span>
            <span className="text-end">{t('order.col.qty')}</span>
            <span>{t('order.col.unit')}</span>
            <span className="text-end">{t('order.col.unitPrice')}</span>
            <span className="text-end">{t('order.col.lineTotal')}</span>
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
            </div>
          ))}
          <dl className="mt-3 space-y-1.5 text-sm">
            <Row label={t('order.subtotal')} value={money(subtotal)} />
            <Row label={t('order.vat')} value={money(vat)} />
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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className="tabular-nums text-content-secondary">{value}</dd>
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
                <p className="mt-0.5 text-xs text-content-tertiary">{t(step.noteKey)}</p>
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
