import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { cn } from '@/shared/lib/cn'
import { useOrders } from './hooks/orderQueries'
import { orderTotals } from './lib'
import { StatusPill } from './components'
import type { Order, OrderStatus } from './types'

const GRID = 'grid grid-cols-[minmax(200px,2.2fr)_1.4fr_1fr_130px_1.4fr_96px] items-center gap-4'
const STATUS_ORDER: OrderStatus[] = ['awaiting_acceptance', 'in_transit', 'delivered', 'closed', 'cancelled', 'declined']

export function OrdersInboxPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useOrders()
  const [filter, setFilter] = useState<OrderStatus | 'all'>('all')

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateShort = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso)) : '—'

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: data.length }
    for (const o of data) c[o.status] = (c[o.status] ?? 0) + 1
    return c
  }, [data])

  const rows = useMemo(() => (filter === 'all' ? data : data.filter((o) => o.status === filter)), [data, filter])

  const nextStep = (o: Order): string => {
    switch (o.status) {
      case 'awaiting_acceptance':
        return t('order.next.awaiting')
      case 'in_transit':
        return t('order.next.arriving', { date: dateShort(o.shipment.expectedArrival) })
      case 'delivered':
        return t('order.next.confirm')
      case 'closed':
        return t('order.next.completed', { date: dateShort(o.closedAt) })
      case 'cancelled':
        return t('order.next.cancelled')
      case 'declined':
        return t('order.next.declined')
    }
  }

  const filters: (OrderStatus | 'all')[] = ['all', ...STATUS_ORDER.filter((s) => counts[s])]

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('order.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('order.inboxSubtitle')}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
              filter === f
                ? 'border-brand-primary bg-brand-primary text-white'
                : 'border-border-subtle text-content-secondary hover:text-content-primary',
            )}
          >
            {f === 'all' ? t('order.filter.all') : t(`order.status.${statusKey(f)}`)}
            <span className={cn('tabular-nums', filter === f ? 'text-white/80' : 'text-content-tertiary')}>{counts[f] ?? 0}</span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface">
          <div className="min-w-[820px] px-5">
            <div className={cn(GRID, 'border-b border-border-subtle py-3 text-xs font-medium text-content-tertiary')}>
              <span>{t('order.col.order')}</span>
              <span>{t('order.col.supplier')}</span>
              <span>{t('order.col.value')}</span>
              <span>{t('order.col.status')}</span>
              <span>{t('order.col.nextStep')}</span>
              <span className="sr-only">{t('order.col.action')}</span>
            </div>
            <ul className="divide-y divide-border-subtle">
              {rows.map((o) => (
                <li
                  key={o.id}
                  onClick={() => navigate(`/buyer/orders/${o.id}`)}
                  className={cn(GRID, 'cursor-pointer py-3.5 transition-colors hover:bg-bg-surface-sunken')}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content-primary">{o.title}</p>
                    <p className="mt-0.5 truncate text-xs text-content-tertiary">{o.id} · {o.poNumber}</p>
                  </div>
                  <span className="truncate text-sm text-content-secondary">{o.supplierShort}</span>
                  <span className="text-sm font-semibold tabular-nums text-content-primary">{money(orderTotals(o).total)}</span>
                  <StatusPill order={o} />
                  <span className="truncate text-sm text-content-secondary">{nextStep(o)}</span>
                  <span className="flex justify-end">
                    <Button
                      size="sm"
                      variant={o.status === 'delivered' ? 'primary' : 'outline'}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/buyer/orders/${o.id}`)
                      }}
                    >
                      {o.status === 'delivered' ? t('order.confirm') : t('order.view')}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}

function statusKey(s: OrderStatus): string {
  return {
    awaiting_acceptance: 'awaiting',
    in_transit: 'inTransit',
    delivered: 'delivered',
    closed: 'closed',
    cancelled: 'cancelled',
    declined: 'declined',
  }[s]
}
