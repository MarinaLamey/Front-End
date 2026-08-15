import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { categoryLabel } from '../types'
import { useRfqs } from '../hooks/useRfqs'
import {
  NEGOTIATION_STATES,
  negotiationActivity,
  negotiationState,
  negotiationStateKey,
  negotiationStateTone,
  type NegotiationState,
} from '../negotiate/negotiationState'
import { supplierViews, type SupplierRfqView } from './deriveSupplierBid'
import { SupplierChips, type SupplierTab } from './components'
import { useSupplierFormat } from './format'

/**
 * The five states of SoT §2.1, in the supplier's words: Awaiting you · Awaiting buyer · Agreed ·
 * Won · Closed. The older Active / Awaiting you / Closed set is gone — §2.1 flags it as a design
 * conflict, because "Active" mapped to nothing stored, there was no word for having replied and
 * waiting, and Agreed — a settled conversation that has not yet produced an order — was invisible.
 */
type Filter = 'all' | NegotiationState

/**
 * How a supplier reads the other side, everywhere, before they accept a purchase order:
 * "Verified buyer · category · city" (SoT §1). The city is required by the rule but an organisation
 * may not have one on file, so an absent part is dropped rather than left as a dangling separator.
 */
function buyerLabel(t: (k: string) => string, category: string, city: string): string {
  return [t('rfq.supplier.nego.verifiedBuyer'), category, city].filter(Boolean).join(' · ')
}
const FILTERS: Filter[] = ['all', ...NEGOTIATION_STATES]

/** Narrow columns stay fixed so the header grid and the row grids resolve to identical tracks. */
const GRID =
  'grid grid-cols-[minmax(180px,1.5fr)_minmax(130px,1.2fr)_56px_minmax(150px,1.9fr)_130px_96px] items-center gap-4'

/**
 * SupplierNegotiationsPage — every conversation the buyer has opened with this supplier.
 *
 * The buyer stays anonymous down to a category and a city, exactly as on the bid detail
 * (spec v1.1 change #11). A row opens the thread it belongs to.
 */
export function SupplierNegotiationsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()
  const { ago } = useSupplierFormat()

  const [filter, setFilter] = useState<Filter>('all')

  const rows = useMemo(
    () =>
      supplierViews(data)
        .filter((view) => view.bid.thread != null)
        .sort((a, b) => (b.bid.thread?.updatedAt ?? '').localeCompare(a.bid.thread?.updatedAt ?? '')),
    [data],
  )

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((k) => [k, 0])) as Record<Filter, number>
    for (const row of rows) {
      c.all += 1
      c[negotiationState(row.bid.thread!, 'supplier')] += 1
    }
    return c
  }, [rows])

  const chips: SupplierTab<Filter>[] = FILTERS.map((id) => ({
    id,
    label: id === 'all' ? t('rfq.supplier.negoList.filter.all') : t(negotiationStateKey(id, 'supplier')),
    count: counts[id],
  }))

  const visible = rows.filter(
    (row) => filter === 'all' || negotiationState(row.bid.thread!, 'supplier') === filter,
  )

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.nego.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('rfq.supplier.negoList.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('rfq.supplier.negoList.empty')}</p>
          <p className="max-w-sm text-sm text-content-secondary">{t('rfq.supplier.negoList.emptyHint')}</p>
          <Button className="mt-1" variant="outline" onClick={() => navigate('/supplier/bids')}>
            {t('rfq.supplier.myBids.title')}
          </Button>
        </div>
      ) : (
        <>
          <SupplierChips chips={chips} active={filter} onChange={setFilter} />

          {visible.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-bg-surface py-14 text-center text-sm text-content-tertiary">
              {t('rfq.supplier.negoList.noneInFilter')}
            </div>
          ) : (
            <div className="mp-stagger overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
              <div className="overflow-x-auto">
                {/* tracks 742 + 5 gaps 80 + row px-5 40 */}
                <div className="min-w-[862px]">
                  <div className={cn(GRID, 'border-b border-border-subtle px-5 py-2.5')}>
                    <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.rfq')}</span>
                    <span className="text-xs font-medium text-content-tertiary">
                      {t('rfq.supplier.negoList.buyer')}
                    </span>
                    <span className="text-xs font-medium text-content-tertiary">
                      {t('rfq.supplier.negoList.round')}
                    </span>
                    <span className="text-xs font-medium text-content-tertiary">
                      {t('rfq.supplier.myBids.lastActivity')}
                    </span>
                    <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.status')}</span>
                    <span className="sr-only">{t('rfq.list.columns.action')}</span>
                  </div>

                  <ul className="divide-y divide-border-subtle">
                    {visible.map((view) => (
                      <Row key={view.rfq.id} view={view} ago={ago} />
                    ))}
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

function Row({ view, ago }: { view: SupplierRfqView; ago: (iso: string) => string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { rfq, detail, bid } = view
  const thread = bid.thread!
  const where = negotiationState(thread, 'supplier')
  const activity = negotiationActivity(thread, 'supplier')
  const latest = thread.offers[thread.offers.length - 1]

  return (
    <li className={cn(GRID, 'px-5 py-4 transition-colors hover:bg-bg-surface-sunken')}>
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold text-content-primary">
          {rfq.title || t('rfq.list.untitled')}
        </p>
        <p className="mt-0.5 truncate text-xs text-content-tertiary">{rfq.reference}</p>
      </div>
      {/*
        SoT §1 + v1.1 #1: the buyer is NEVER a company name on this list.
        Two corrections in one. Identities are exchanged when the supplier ACCEPTS the purchase
        order — not at award — so winning does not reveal anything, and a closed negotiation was
        never accepted and so was never revealed at all. Both were leaking a real name here. The
        label matches the room: "Verified buyer · category · city".
      */}
      <span className="min-w-0 truncate text-sm text-content-secondary">
        {buyerLabel(t, categoryLabel(rfq.categories), detail.deliverToCity)}
      </span>
      <span className="text-sm text-content-secondary">{latest.version}</span>
      <span className="min-w-0 truncate text-sm text-content-secondary" title={t(activity.key, { version: activity.version, po: rfq.reference })}>
        {t(activity.key, { version: activity.version, po: rfq.reference })} · {ago(thread.updatedAt)}
      </span>
      <span className="justify-self-start">
        <StatusBadge label={t(negotiationStateKey(where, 'supplier'))} tone={negotiationStateTone(where)} dot={false} />
      </span>
      <span className="justify-self-end">
        <Button size="sm" variant="outline" onClick={() => navigate(`/supplier/negotiations/${rfq.id}`)}>
          {where === 'closed' ? t('rfq.list.actions.view') : t('rfq.supplier.myBids.open')}
        </Button>
      </span>
    </li>
  )
}
