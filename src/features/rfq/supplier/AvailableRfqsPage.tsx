import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'
import { Select } from '@/shared/ui/Select'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { categoryLabel } from '../types'
import { useRfqs } from '../hooks/useRfqs'
import { useSaveSupplierBid } from '../hooks/rfqQueries'
import { supplierViews, isOpenToBids, type SupplierRfqView } from './deriveSupplierBid'
import { SupplierTabs, type SupplierTab } from './components'
import { useSupplierFormat } from './format'
import { toDraftRecord } from './bidRecord'

type Tab = 'all' | 'matched' | 'declined'
type SortKey = 'closing' | 'newest' | 'items'

const ANY = 'any'

/**
 * AvailableRfqsPage — the supplier's way in.
 *
 * Browse all is every live RFQ delivering into the supplier's regions, whatever the category;
 * Matched narrows that to their own categories; Declined holds the ones they passed on and can
 * still change their mind about. The number of bids already received is deliberately absent —
 * a supplier prices their own work, not the crowd (spec §4).
 */
export function AvailableRfqsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()
  const saveBid = useSaveSupplierBid()
  const { money, dateShort, ago } = useSupplierFormat()

  const [tab, setTab] = useState<Tab>('all')
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ANY)
  const [region, setRegion] = useState(ANY)
  const [closing, setClosing] = useState(ANY)
  const [sort, setSort] = useState<SortKey>('closing')

  const views = useMemo(() => supplierViews(data), [data])
  const open = useMemo(() => views.filter(isOpenToBids), [views])

  // Declined keeps RFQs that have since closed, so the supplier can see what they passed on.
  const declined = useMemo(() => views.filter((v) => v.bid.status === 'declined'), [views])
  const browsable = useMemo(() => open.filter((v) => v.bid.status !== 'declined'), [open])
  const matched = useMemo(() => browsable.filter((v) => v.matched), [browsable])

  const pool = tab === 'declined' ? declined : tab === 'matched' ? matched : browsable

  const categories = useMemo(
    () => [...new Set(views.flatMap((v) => v.rfq.categories.map((c) => c.name)))].sort(),
    [views],
  )
  const regions = useMemo(() => [...new Set(views.map((v) => v.detail.deliverToCity))].sort(), [views])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    const filtered = pool.filter((v) => {
      const matchesQuery =
        !q ||
        v.rfq.title.toLowerCase().includes(q) ||
        v.rfq.reference.toLowerCase().includes(q) ||
        categoryLabel(v.rfq.categories).toLowerCase().includes(q)
      const matchesCategory = category === ANY || v.rfq.categories.some((c) => c.name === category)
      const matchesRegion = region === ANY || v.detail.deliverToCity === region
      const matchesClosing =
        closing === ANY ||
        (closing === 'soon' ? v.closingInDays <= 2 : v.closingInDays <= Number(closing))
      return matchesQuery && matchesCategory && matchesRegion && matchesClosing
    })
    return filtered.sort((a, b) => {
      if (sort === 'newest') return b.rfq.createdAt.localeCompare(a.rfq.createdAt)
      if (sort === 'items') return b.detail.lineItems.length - a.detail.lineItems.length
      return a.rfq.closingDate.localeCompare(b.rfq.closingDate)
    })
  }, [pool, query, category, region, closing, sort])

  const tabs: SupplierTab<Tab>[] = [
    { id: 'all', label: t('rfq.supplier.available.tabs.all'), count: browsable.length },
    { id: 'matched', label: t('rfq.supplier.available.tabs.matched'), count: matched.length },
    { id: 'declined', label: t('rfq.supplier.available.tabs.declined'), count: declined.length },
  ]

  /** Reverse a decline — the RFQ returns to the browsable list and the bid form opens. */
  const bidAnyway = (view: SupplierRfqView) =>
    saveBid.mutate(
      { id: view.rfq.id, bid: toDraftRecord(view, 'invited') },
      { onSuccess: () => navigate(`/supplier/rfqs/${view.rfq.id}`) },
    )

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          {t('rfq.supplier.available.title')}
        </h1>
        <p className="mt-1 text-sm text-content-secondary">{t('rfq.supplier.available.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <SupplierTabs tabs={tabs} active={tab} onChange={setTab} />

          <div className="flex flex-wrap items-center gap-3">
            <Input
              className="min-w-[240px] flex-1"
              placeholder={t('rfq.supplier.available.searchPlaceholder')}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Select
              className="w-[150px]"
              ariaLabel={t('rfq.supplier.available.filters.category')}
              value={category}
              onChange={setCategory}
              options={[
                { value: ANY, label: t('rfq.supplier.available.filters.category') },
                ...categories.map((name) => ({ value: name, label: name })),
              ]}
            />
            <Select
              className="w-[170px]"
              ariaLabel={t('rfq.supplier.available.filters.region')}
              value={region}
              onChange={setRegion}
              options={[
                { value: ANY, label: t('rfq.supplier.available.filters.region') },
                ...regions.map((name) => ({ value: name, label: name })),
              ]}
            />
            <Select
              className="w-[130px]"
              ariaLabel={t('rfq.supplier.available.filters.closing')}
              value={closing}
              onChange={setClosing}
              options={[
                { value: ANY, label: t('rfq.supplier.available.filters.closing') },
                { value: 'soon', label: t('rfq.supplier.available.filters.closingSoon') },
                { value: '7', label: t('rfq.supplier.available.filters.within7') },
                { value: '30', label: t('rfq.supplier.available.filters.within30') },
              ]}
            />
            <Select
              className="ms-auto w-[190px]"
              ariaLabel={t('rfq.supplier.available.sort.label')}
              value={sort}
              onChange={(value) => setSort(value as SortKey)}
              options={[
                { value: 'closing', label: t('rfq.supplier.available.sort.closing') },
                { value: 'newest', label: t('rfq.supplier.available.sort.newest') },
                { value: 'items', label: t('rfq.supplier.available.sort.items') },
              ]}
            />
          </div>

          {rows.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-bg-surface py-16 text-center">
              <p className="text-base font-semibold text-content-primary">
                {t(`rfq.supplier.available.empty.${tab}`)}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-content-secondary">
                {t(`rfq.supplier.available.emptyHint.${tab}`)}
              </p>
            </div>
          ) : (
            <ul className="mp-stagger space-y-4">
              {rows.map((view) => (
                <OpportunityCard
                  key={view.rfq.id}
                  view={view}
                  tab={tab}
                  money={money}
                  dateShort={dateShort}
                  ago={ago}
                  onOpen={() => navigate(`/supplier/rfqs/${view.rfq.id}`)}
                  onViewBid={() => navigate(`/supplier/bids/${view.rfq.id}`)}
                  onBidAnyway={() => bidAnyway(view)}
                  busy={saveBid.isPending}
                />
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}

interface CardProps {
  view: SupplierRfqView
  tab: Tab
  money: (sar: number) => string
  dateShort: (iso: string) => string
  ago: (iso: string) => string
  onOpen: () => void
  onViewBid: () => void
  onBidAnyway: () => void
  busy: boolean
}

/** One opportunity. The right column always answers "when does this close" and "what do I do". */
function OpportunityCard({
  view,
  tab,
  money,
  dateShort,
  ago,
  onOpen,
  onViewBid,
  onBidAnyway,
  busy,
}: CardProps) {
  const { t } = useTranslation()
  const { rfq, detail, bid } = view
  const declined = bid.status === 'declined'
  const closed = view.closingInDays < 0 || rfq.status !== 'live'
  const hasBid = bid.status === 'submitted' || bid.status === 'negotiating'
  const units = detail.lineItems.reduce((sum, item) => sum + item.quantity, 0)

  // A bid that expired or was withdrawn leaves the RFQ open to a fresh one, so the CTA stays
  // "View & bid" — but the card has to say what happened, or it reads as never bid on.
  const lapsed = bid.status === 'expired' || bid.status === 'withdrawn'

  const badge = declined
    ? { label: t('rfq.supplier.bidStatus.declined'), tone: 'neutral' as const }
    : hasBid
      ? { label: t('rfq.supplier.available.bidSubmitted'), tone: 'info' as const }
      : bid.status === 'draft'
        ? { label: t('rfq.supplier.bidStatus.draft'), tone: 'neutral' as const }
        : lapsed
          ? { label: t(`rfq.supplier.bidStatus.${bid.status}`), tone: 'warning' as const }
          : view.closingSoon
            ? { label: t('rfq.supplier.available.closingSoon'), tone: 'warning' as const }
            : { label: t(`rfq.statusLabel.${rfq.status}`), tone: 'success' as const }

  return (
    <li
      className={cn(
        'rounded-xl border border-border-subtle bg-bg-surface p-5 transition-colors',
        declined && 'text-content-tertiary',
        declined && closed && 'opacity-60',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-content-tertiary">{rfq.reference}</span>
            <StatusBadge label={badge.label} tone={badge.tone} dot={false} />
          </div>
          <h2
            className={cn(
              'mt-1.5 text-base font-bold',
              declined ? 'text-content-secondary' : 'text-content-primary',
            )}
          >
            {rfq.title || t('rfq.list.untitled')}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">
            {t('rfq.supplier.verifiedBuyer')} · {categoryLabel(rfq.categories)} · {detail.deliverToCity}
          </p>
          <p className="mt-1 text-xs text-content-tertiary">
            {t('rfq.supplier.available.itemsUnits', {
              items: detail.lineItems.length,
              units: units.toLocaleString(),
            })}{' '}
            · {t('rfq.supplier.available.deliverTo', { city: detail.deliverToCity })}
          </p>

          {declined ? (
            <p className="mt-1.5 text-xs text-content-tertiary">
              {t('rfq.supplier.available.declinedAgo', { ago: ago(bid.updatedAt) })}
            </p>
          ) : hasBid ? (
            <p className="mt-1.5 text-xs font-medium text-content-link">
              {t('rfq.supplier.available.yourBid', { amount: money(bid.totalSar) })} ·{' '}
              {t(
                bid.status === 'negotiating'
                  ? 'rfq.supplier.available.underNegotiation'
                  : 'rfq.supplier.available.awaitingReview',
              )}
            </p>
          ) : bid.status === 'draft' ? (
            <p className="mt-1.5 text-xs font-medium text-content-link">
              {t('rfq.supplier.available.draftSaved', { ago: ago(bid.updatedAt) })}
            </p>
          ) : lapsed ? (
            <p className="mt-1.5 text-xs font-medium text-status-warning-strong">
              {t(`rfq.supplier.available.${bid.status === 'expired' ? 'bidExpired' : 'bidWithdrawn'}`, {
                ago: ago(bid.updatedAt),
              })}
            </p>
          ) : tab === 'matched' && view.matchReason ? (
            <p className="mt-1.5 text-xs font-medium text-content-link">
              {t(`rfq.supplier.available.match.${view.matchReason}`)}
            </p>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2.5">
          <span
            className={cn(
              'text-xs font-medium',
              closed
                ? 'text-status-warning-strong'
                : view.closingSoon
                  ? 'text-status-warning-strong'
                  : 'text-content-secondary',
            )}
          >
            {closed
              ? t('rfq.supplier.available.closedOn', { date: dateShort(rfq.closingDate) })
              : view.closingInDays <= 1
                ? t('rfq.supplier.available.closesTomorrow')
                : t('rfq.supplier.available.closesIn', { count: view.closingInDays })}
          </span>

          {declined ? (
            !closed && (
              <Button size="sm" variant="outline" onClick={onBidAnyway} isLoading={busy}>
                {t('rfq.supplier.available.bidAnyway')}
              </Button>
            )
          ) : hasBid ? (
            <Button size="sm" onClick={onViewBid}>
              {t('rfq.supplier.available.viewYourBid')}
            </Button>
          ) : (
            <Button size="sm" onClick={onOpen}>
              {bid.status === 'draft'
                ? t('rfq.supplier.available.resumeDraft')
                : t('rfq.supplier.available.viewAndBid')}
            </Button>
          )}
        </div>
      </div>
    </li>
  )
}
