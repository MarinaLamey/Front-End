import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { categoryLabel } from '../types'
import type { SupplierBidStatus } from '../types'
import { useRfqs } from '../hooks/useRfqs'
import { hasBidRecord, supplierViews, type SupplierRfqView } from './deriveSupplierBid'
import { SupplierChips, type SupplierTab } from './components'
import { useSupplierFormat } from './format'

/** The chips My Bids filters by — the statuses with a tab of their own (spec §2). */
type Chip = 'all' | 'draft' | 'submitted' | 'negotiating' | 'won' | 'lost'
const CHIPS: Chip[] = ['all', 'draft', 'submitted', 'negotiating', 'won', 'lost']

/** Every bid status maps to one badge tone — declared once so a new status can't go uncoloured. */
const STATUS_TONE: Record<SupplierBidStatus, 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'> =
  {
    invited: 'neutral',
    draft: 'neutral',
    submitted: 'neutral',
    negotiating: 'warning',
    declined: 'neutral',
    withdrawn: 'neutral',
    expired: 'danger',
    won: 'success',
    lost: 'danger',
    cancelled: 'danger',
  }

/**
 * Header and rows are separate grids, so they only line up while every track resolves to the same
 * width in both. Keep the narrow columns FIXED — an `auto` or `fr` track sizes to its own content,
 * and the header's `sr-only` action cell is 0px wide against a real button in the row, which shifts
 * every heading off its column. Only the two text columns flex.
 */
const GRID =
  'grid grid-cols-[minmax(180px,1.8fr)_124px_76px_138px_minmax(150px,1.9fr)_96px] items-center gap-4'

/**
 * MyBidsPage — every bid the supplier has raised and where each one stands.
 *
 * The last-activity column draws from a fixed vocabulary (spec §7) so it stays translatable and
 * testable; the row action follows the status — resume a draft, open a live negotiation, or view
 * a bid that has been sent.
 */
export function MyBidsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()
  const { money, dateShort, ago } = useSupplierFormat()

  const [chip, setChip] = useState<Chip>('all')

  const rows = useMemo(
    () =>
      supplierViews(data)
        .filter(hasBidRecord)
        .sort((a, b) => b.bid.updatedAt.localeCompare(a.bid.updatedAt)),
    [data],
  )

  const counts = useMemo(() => {
    const c = Object.fromEntries(CHIPS.map((k) => [k, 0])) as Record<Chip, number>
    for (const row of rows) {
      c.all += 1
      const status = row.bid.status as Chip
      if (status in c) c[status] += 1
    }
    return c
  }, [rows])

  const chips: SupplierTab<Chip>[] = CHIPS.map((id) => ({
    id,
    label: t(`rfq.supplier.myBids.filter.${id}`),
    count: counts[id],
  }))

  const visible = rows.filter((row) => chip === 'all' || row.bid.status === chip)

  /** Where a row goes: the bid page, unless there is a live conversation or an unsent draft. */
  const openRow = (view: SupplierRfqView) => {
    if (view.bid.status === 'draft') return navigate(`/supplier/rfqs/${view.rfq.id}/bid`)
    if (view.bid.status === 'negotiating') return navigate(`/supplier/negotiations/${view.rfq.id}`)
    return navigate(`/supplier/bids/${view.rfq.id}`)
  }
  const actionLabel = (status: SupplierBidStatus) =>
    status === 'draft'
      ? t('rfq.list.actions.resume')
      : status === 'negotiating'
        ? t('rfq.supplier.myBids.open')
        : t('rfq.list.actions.view')

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          {t('rfq.supplier.myBids.title')}
        </h1>
        <p className="mt-1 text-sm text-content-secondary">{t('rfq.supplier.myBids.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface shadow-sm py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('rfq.supplier.myBids.empty')}</p>
          <p className="max-w-sm text-sm text-content-secondary">{t('rfq.supplier.myBids.emptyHint')}</p>
          <Button className="mt-1" variant="outline" onClick={() => navigate('/supplier/rfqs')}>
            {t('rfq.supplier.available.title')}
          </Button>
        </div>
      ) : (
        <>
          <SupplierChips chips={chips} active={chip} onChange={setChip} />

          {visible.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm py-14 text-center text-sm text-content-tertiary">
              {t('rfq.supplier.myBids.noneInFilter')}
            </div>
          ) : (
            <div className="mp-stagger overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-sm">
              <div className="overflow-x-auto">
                {/* tracks 764 + 5 gaps 80 + row px-5 40 — below this the table scrolls rather than
                    squeezing a column past its fixed width and breaking the header alignment. */}
                <div className="min-w-[884px]">
                  <div className={cn(GRID, 'border-b border-border-subtle px-5 py-2.5')}>
                    <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.rfq')}</span>
                    <span className="text-xs font-medium text-content-tertiary">{t('rfq.supplier.bidTotal')}</span>
                    <span className="text-xs font-medium text-content-tertiary">
                      {t('rfq.supplier.myBids.submitted')}
                    </span>
                    <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.status')}</span>
                    <span className="text-xs font-medium text-content-tertiary">
                      {t('rfq.supplier.myBids.lastActivity')}
                    </span>
                    <span className="sr-only">{t('rfq.list.columns.action')}</span>
                  </div>

                  <ul className="divide-y divide-border-subtle">
                    {visible.map((view) => {
                      const { rfq, bid } = view
                      const partial = bid.itemsQuoted > 0 && bid.itemsQuoted < bid.itemsTotal
                      return (
                        <li key={rfq.id} className={cn(GRID, 'px-5 py-4 transition-colors hover:bg-bg-surface-sunken')}>
                          <div className="min-w-0">
                            <p className="truncate text-sm font-semibold text-content-primary">
                              {rfq.title || t('rfq.list.untitled')}
                            </p>
                            <p className="mt-0.5 truncate text-xs text-content-tertiary">
                              {rfq.reference} · {categoryLabel(rfq.categories)}
                              {partial &&
                                ` · ${t('rfq.supplier.myBids.partialBid', {
                                  n: bid.itemsQuoted,
                                  m: bid.itemsTotal,
                                })}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-content-primary">
                            {bid.itemsQuoted > 0 ? money(bid.totalSar) : '—'}
                          </span>
                          <span className="text-sm text-content-secondary">
                            {bid.status === 'draft' || !bid.submittedAt ? '—' : dateShort(bid.submittedAt)}
                          </span>
                          <span className="justify-self-start">
                            <StatusBadge
                              label={t(`rfq.supplier.bidStatus.${bid.status}`)}
                              tone={STATUS_TONE[bid.status]}
                              dot={false}
                            />
                          </span>
                          {/* min-w-0: a grid item defaults to min-width:auto, which stops `truncate`
                              shrinking it and lets long activity text widen the whole column. */}
                          <span className="min-w-0 truncate text-sm text-content-secondary">
                            {t(bid.activityKey, bid.activityParams)}
                            {bid.status !== 'invited' && (
                              <span className="text-content-tertiary"> · {ago(bid.updatedAt)}</span>
                            )}
                          </span>
                          <span className="justify-self-end">
                            <Button size="sm" variant="outline" onClick={() => openRow(view)}>
                              {actionLabel(bid.status)}
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
