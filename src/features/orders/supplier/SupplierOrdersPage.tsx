import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { useSupplierOrders } from '../hooks/orderQueries'
import { orderTotals } from '../lib'
import type { Order } from '../types'
import {
  SUPPLIER_STAGES,
  nextStepKey,
  resolvedAt,
  rowAction,
  stageCounts,
  stageOf,
  supplierOrders,
  supplierStatusKey,
  type SupplierOrderStage,
} from './supplierOrders'

type Tab = SupplierOrderStage | 'all'
const TABS: Tab[] = ['all', ...SUPPLIER_STAGES]

/**
 * Header and rows are separate grids, so the narrow columns are FIXED — an `auto` or `fr` track
 * sizes to its own content and would shift every heading off its column.
 */
const GRID =
  'grid grid-cols-[minmax(190px,1.7fr)_minmax(130px,1.1fr)_120px_170px_minmax(170px,1.8fr)_104px] items-center gap-4'

/**
 * SupplierOrdersPage — every order this supplier has won, and what each one needs from them next.
 *
 * The list is ordered around obligation rather than lifecycle: an order awaiting the buyer is not
 * the supplier's problem, so it gets a quiet row, while anything needing a decision or a shipment
 * update carries a solid button.
 */
export function SupplierOrdersPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useSupplierOrders()
  const [tab, setTab] = useState<Tab>('all')

  const orders = useMemo(() => supplierOrders(data), [data])
  const counts = useMemo(() => stageCounts(orders), [orders])
  const visible = orders.filter((order) => tab === 'all' || stageOf(order) === tab)

  const money = (n: number) => `SAR ${Math.round(n).toLocaleString(i18n.language)}`
  const dateShort = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso)) : '—'

  const open = (order: Order) => {
    const stage = stageOf(order)
    if (order.cancellationRequest && order.cancellationRequest.outcome == null) {
      return navigate(`/supplier/orders/${order.id}/cancellation`)
    }
    if (stage === 'toReview') return navigate(`/supplier/orders/${order.id}/purchase-order`)
    return navigate(`/supplier/orders/${order.id}`)
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('order.supplierView.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('order.supplierView.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface shadow-sm py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('order.supplierView.empty')}</p>
          <p className="max-w-sm text-sm text-content-secondary">{t('order.supplierView.emptyHint')}</p>
          <Button className="mt-1" variant="outline" onClick={() => navigate('/supplier/bids')}>
            {t('rfq.supplier.myBids.title')}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {TABS.map((id) => {
              const on = tab === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={cn(
                    'mp-press cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                    on
                      ? 'border-brand-primary bg-brand-primary text-white'
                      : 'border-border-subtle text-content-secondary hover:text-content-primary',
                  )}
                >
                  {t(`order.supplierView.tab.${id}`)}
                  <span className={cn('ms-1.5', on ? 'text-white/70' : 'text-content-tertiary')}>{counts[id]}</span>
                </button>
              )
            })}
          </div>

          {visible.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm py-14 text-center text-sm text-content-tertiary">
              {t('order.supplierView.noneInTab')}
            </div>
          ) : (
            <div className="mp-stagger overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-sm">
              <div className="overflow-x-auto">
                {/* tracks 884 + 5 gaps 80 + row px-5 40 */}
                <div className="min-w-[1004px]">
                  <div className={cn(GRID, 'border-b border-border-subtle px-5 py-2.5')}>
                    <span className="text-xs font-medium text-content-tertiary">{t('order.supplierView.col.order')}</span>
                    <span className="text-xs font-medium text-content-tertiary">{t('order.buyer')}</span>
                    <span className="text-xs font-medium text-content-tertiary">{t('order.supplierView.col.value')}</span>
                    <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.status')}</span>
                    <span className="text-xs font-medium text-content-tertiary">{t('order.supplierView.col.nextStep')}</span>
                    <span className="sr-only">{t('rfq.list.columns.action')}</span>
                  </div>

                  <ul className="divide-y divide-border-subtle">
                    {visible.map((order) => {
                      const badge = supplierStatusKey(order)
                      const action = rowAction(order)
                      const step = nextStepKey(order)
                      return (
                        <li
                          key={order.id}
                          className={cn(GRID, 'px-5 py-4 transition-colors hover:bg-bg-surface-sunken')}
                        >
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-content-primary">{order.title}</p>
                            <p className="mt-0.5 truncate text-xs text-content-tertiary">
                              {order.poNumber}
                            </p>
                          </div>
                          {/* Identities are exchanged on acceptance — until then the buyer is masked. */}
                          <span className="min-w-0 truncate text-sm text-content-secondary">
                            {order.acceptedAt ? order.buyer.name : t('order.supplierView.verifiedBuyer')}
                          </span>
                          <span className="text-sm font-semibold tabular-nums text-content-primary">
                            {money(orderTotals(order).total)}
                          </span>
                          <span className="justify-self-start">
                            <StatusBadge
                              label={t(`order.supplierView.status.${badge.key}`)}
                              tone={badge.tone}
                              dot={false}
                            />
                          </span>
                          <span className="min-w-0 truncate text-sm text-content-secondary">
                            {t(`order.supplierView.nextStep.${step}`, { date: dateShort(resolvedAt(order)) })}
                          </span>
                          <span className="justify-self-end">
                            <Button
                              size="sm"
                              variant={action.primary ? 'primary' : 'outline'}
                              onClick={() => open(order)}
                            >
                              {t(`order.supplierView.action.${action.labelKey}`)}
                            </Button>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
