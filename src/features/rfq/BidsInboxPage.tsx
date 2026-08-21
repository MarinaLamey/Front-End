import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge, ChevronDownIcon } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useRfqs } from './hooks/useRfqs'
import { useMarkBidsOpened } from './hooks/rfqQueries'
import { deriveRfqDetail } from './detail/deriveRfqDetail'
import type { Bid, BidStatus, RfqDraft, RfqStatus } from './types'

/** The one union StatusBadge derives its palette from — mirrored so the tone can be forced per status. */
type BadgeTone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'

/** The bid-status filter, plus the synthetic `all` bucket. */
type StatusChip = 'all' | BidStatus
const STATUS_CHIPS: StatusChip[] = ['all', 'submitted', 'negotiating', 'withdrawn', 'declined', 'expired']

/** Active bids can still be awarded; the rest are terminal (unselectable, greyed). */
const isActive = (b: Bid) => b.status === 'submitted' || b.status === 'negotiating'
const isCompliant = (b: Bid) => Object.values(b.compliance).every(Boolean)
const coversAll = (b: Bid) => b.itemsCovered === b.itemsTotal
/** Eligible for auto-selection: active, covers every line and clears every required doc. */
const isEligible = (b: Bid) => isActive(b) && coversAll(b) && isCompliant(b)

/** Bidder status renders as plain coloured text (not a pill) — blue Negotiating, neutral Submitted,
 *  grey Withdrawn, red Declined/Expired — matching the Compare-bids screens. */
const BID_TEXT_TONE: Record<BidStatus, string> = {
  submitted: 'text-content-secondary',
  negotiating: 'text-status-info',
  withdrawn: 'text-content-tertiary',
  declined: 'text-status-danger',
  expired: 'text-status-danger',
}

/** RFQ-level badge for the row header — Live / Awarded / Cancelled / Expired. */
function rfqBadgeTone(status: RfqStatus): BadgeTone {
  if (status === 'live') return 'info'
  if (status === 'awarded' || status === 'partially_awarded') return 'brand'
  if (status === 'cancelled') return 'danger'
  return 'neutral'
}

const HEADER_GRID = 'grid grid-cols-[20px_minmax(180px,2.4fr)_0.7fr_1fr_120px_84px] items-center gap-4'
// The sub-table header and its bid rows are separate grids: an `auto` last track sized to the
// header's 0px `sr-only` cell in one and to a real button in the other, shifting every heading off
// its column. Narrow columns are fixed so both resolve identically.
const BID_GRID =
  'grid grid-cols-[28px_minmax(120px,1.4fr)_130px_84px_100px_78px_minmax(90px,1fr)_96px] items-center gap-3'

/**
 * BidsInboxPage — the "Bids" destination. Every live RFQ that has attracted offers, each row
 * collapsible to a per-bid sub-table. Bid-status chips (counts aggregated across all RFQs) and a
 * "compliant only" toggle filter the bids on show; the best-3 eligible bids per RFQ are auto-checked
 * so "Compare selected" is one click away.
 */
export function BidsInboxPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()
  const markOpened = useMarkBidsOpened()

  const [statusFilter, setStatusFilter] = useState<StatusChip>('all')
  const [compliantOnly, setCompliantOnly] = useState(false)
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const [selected, setSelected] = useState<Record<string, string[]>>({})

  // RFQs with offers to review, soonest-closing first. Each carries its full seeded bid set.
  const rows = useMemo(
    () => data.filter((rfq) => rfq.bids > 0).sort((a, b) => a.closingDate.localeCompare(b.closingDate)),
    [data],
  )
  const details = useMemo(() => new Map(rows.map((rfq) => [rfq.id, deriveRfqDetail(rfq)])), [rows])

  // Chip counts aggregate every bid across every RFQ (independent of the compliant toggle).
  const counts = useMemo(() => {
    const c: Record<StatusChip, number> = {
      all: 0,
      submitted: 0,
      negotiating: 0,
      withdrawn: 0,
      declined: 0,
      expired: 0,
    }
    for (const rfq of rows) {
      for (const bid of details.get(rfq.id)!.bids) {
        c.all += 1
        c[bid.status] += 1
      }
    }
    return c
  }, [rows, details])

  // Best-3 eligible bids per RFQ (by lowest total) — the default comparison set.
  const defaults = useMemo(() => {
    const map = new Map<string, string[]>()
    for (const rfq of rows) {
      const best = details
        .get(rfq.id)!
        .bids.filter(isEligible)
        .sort((a, b) => a.totalSar - b.totalSar)
        .slice(0, 3)
        .map((b) => b.id)
      map.set(rfq.id, best)
    }
    return map
  }, [rows, details])

  const daysUntil = (iso: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0)
  const closingText = (rfq: RfqDraft) => {
    const days = daysUntil(rfq.closingDate)
    return days > 0 ? t('rfq.list.closing.inDays', { count: days }) : t('rfq.list.closing.closed')
  }
  const dateShort = (iso: string) =>
    iso
      ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso))
      : '—'
  // Row subtitle: reference + a status-contextual detail (live → closes-in, awarded → awarded date,
  // otherwise → closed date), e.g. "RFQ-2026-0142 · closes in 3 days".
  const rowSubtitle = (rfq: RfqDraft) => {
    const ctx =
      rfq.status === 'live'
        ? daysUntil(rfq.closingDate) > 0
          ? t('rfq.bidsInbox.rowClosesIn', { count: daysUntil(rfq.closingDate) })
          : t('rfq.list.closing.closed')
        : rfq.status === 'awarded' || rfq.status === 'partially_awarded'
          ? t('rfq.bidsInbox.rowAwarded', { date: dateShort(rfq.closingDate) })
          : t('rfq.bidsInbox.rowClosed', { date: dateShort(rfq.closingDate) })
    return `${rfq.reference} · ${ctx}`
  }

  const matchesFilter = (b: Bid) =>
    (statusFilter === 'all' || b.status === statusFilter) && (!compliantOnly || isCompliant(b))

  const selectionFor = (rfqId: string) => selected[rfqId] ?? defaults.get(rfqId) ?? []
  const toggleBid = (rfqId: string, bidId: string) =>
    setSelected((prev) => {
      const current = prev[rfqId] ?? defaults.get(rfqId) ?? []
      const next = current.includes(bidId)
        ? current.filter((id) => id !== bidId)
        : [...current, bidId]
      return { ...prev, [rfqId]: next }
    })

  // Collapsed by default — a row only opens when its own expand arrow is clicked.
  const isOpen = (rfqId: string) => expanded[rfqId] ?? false
  /**
   * Expanding a row reveals every one of that RFQ's bids in full — bidder, total, coverage,
   * delivery and compliance — so that IS the buyer opening them, and they stop counting towards
   * "Bids to Review". Collapsing marks nothing: opened once is opened for good.
   */
  const toggleOpen = (rfqId: string) => {
    const opening = !isOpen(rfqId)
    setExpanded((prev) => ({ ...prev, [rfqId]: opening }))
    if (!opening) return
    const bidIds = details.get(rfqId)?.bids.map((bid) => bid.id) ?? []
    if (bidIds.length > 0) markOpened.mutate({ id: rfqId, bidIds })
  }

  // Only surface RFQs that still have a bid matching the active filter.
  const visibleRows = rows.filter((rfq) => details.get(rfq.id)!.bids.some(matchesFilter))

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.bidsInbox.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('rfq.bidsInbox.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface shadow-sm py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('rfq.bidsInbox.empty')}</p>
          <p className="max-w-sm text-sm text-content-secondary">{t('rfq.bidsInbox.emptyHint')}</p>
          <Button className="mt-1" variant="outline" onClick={() => navigate('/buyer/rfqs')}>
            {t('rfq.title')}
          </Button>
        </div>
      ) : (
        <>
          {/* Controls: status chips (with counts) + compliant toggle + fixed sort */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {STATUS_CHIPS.map((chip) => {
                const active = statusFilter === chip
                return (
                  <button
                    key={chip}
                    type="button"
                    onClick={() => setStatusFilter(chip)}
                    className={cn(
                      'mp-press cursor-pointer rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
                      active
                        ? 'border-brand-primary bg-brand-subtle text-brand-primary'
                        : 'border-border-subtle text-content-secondary hover:text-content-primary',
                    )}
                  >
                    {t(`rfq.bidsInbox.filter.${chip}`)}
                    <span className="ms-1.5 text-content-tertiary">{counts[chip]}</span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center gap-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm text-content-secondary">
                <input
                  type="checkbox"
                  checked={compliantOnly}
                  onChange={(e) => setCompliantOnly(e.target.checked)}
                  className="h-4 w-4 cursor-pointer accent-brand-primary"
                />
                {t('rfq.bidsInbox.compliantOnly')}
              </label>
              <span className="text-sm text-content-tertiary">
                {t('rfq.compare.sort')}: {t('rfq.bidsInbox.sortLowestTotal')}
              </span>
            </div>
          </div>

          {visibleRows.length === 0 ? (
            <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm py-14 text-center text-sm text-content-tertiary">
              {t('rfq.compare.noneToCompare')}
            </div>
          ) : (
            <div className="mp-stagger overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-sm">
              {/* Column headers */}
              <div className={cn(HEADER_GRID, 'border-b border-border-subtle px-5 py-2.5')}>
                <span />
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.rfq')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.bids')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.closing')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.status')}</span>
                <span />
              </div>

              <ul className="divide-y divide-border-subtle">
              {visibleRows.map((rfq) => {
                const detail = details.get(rfq.id)!
                const bids = [...detail.bids].filter(matchesFilter).sort((a, b) => a.totalSar - b.totalSar)
                const open = isOpen(rfq.id)
                const certTotal = detail.certifications.length
                const sel = selectionFor(rfq.id).filter((id) => bids.some((b) => b.id === id))
                // Best-3 (eligible, lowest total) — highlighted green regardless of manual selection.
                // `bestIds` is pre-sorted ascending, so bestIds[0] is the single lowest eligible total.
                const bestIds = defaults.get(rfq.id) ?? []

                return (
                  <li key={rfq.id}>
                    {/* RFQ row — only the left triangle expands the bid sub-table; View opens the RFQ. */}
                    <div
                      className={cn(
                        HEADER_GRID,
                        'px-5 py-4 transition-colors',
                        open ? 'bg-bg-surface-sunken' : 'hover:bg-bg-surface-sunken',
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleOpen(rfq.id)}
                        aria-expanded={open}
                        aria-label={t('rfq.bidsInbox.toggleBids', { rfq: rfq.title || rfq.reference })}
                        className="mp-press flex h-5 w-5 cursor-pointer items-center justify-center"
                      >
                        <ChevronDownIcon
                          className={cn(
                            'h-4 w-4 text-content-tertiary transition-transform duration-200',
                            open ? '' : '-rotate-90 rtl:rotate-90',
                          )}
                        />
                      </button>
                      <div className="min-w-0 text-start">
                        <p className="truncate text-sm font-semibold text-content-primary">
                          {rfq.title || t('rfq.list.untitled')}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-content-tertiary">{rowSubtitle(rfq)}</p>
                      </div>
                      <span className="text-sm font-semibold text-content-primary">{rfq.bids}</span>
                      <span className="truncate text-sm text-content-secondary">{closingText(rfq)}</span>
                      <span className="justify-self-start">
                        <StatusBadge label={t(`rfq.statusLabel.${rfq.status}`)} tone={rfqBadgeTone(rfq.status)} />
                      </span>
                      <span className="justify-self-end">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/buyer/rfqs/${rfq.id}`)}>
                          {t('rfq.list.actions.view')}
                        </Button>
                      </span>
                    </div>

                    {open && (
                      <div className="border-t border-border-subtle px-5 pb-5">
                        <div className="overflow-x-auto">
                          <div className="min-w-[810px]">
                            {/* Sub-table header */}
                            <div className={cn(BID_GRID, 'border-b border-border-subtle py-2.5')}>
                              <span />
                              <span className="text-xs font-medium text-content-tertiary">{t('rfq.bidsInbox.col.bidder')}</span>
                              <span className="text-xs font-medium text-content-tertiary">{t('rfq.bidsInbox.col.bidTotal')}</span>
                              <span className="text-xs font-medium text-content-tertiary">{t('rfq.bidsInbox.col.itemsPriced')}</span>
                              <span className="text-xs font-medium text-content-tertiary">{t('rfq.bidsInbox.col.delivery')}</span>
                              <span className="text-xs font-medium text-content-tertiary">{t('rfq.bidsInbox.col.compliance')}</span>
                              <span className="text-xs font-medium text-content-tertiary">{t('rfq.bidsInbox.col.status')}</span>
                              <span className="sr-only">{t('rfq.bidsInbox.col.negotiate')}</span>
                            </div>

                            <ul className="divide-y divide-border-subtle">
                              {bids.map((bid) => {
                                const compliantCount = Object.values(bid.compliance).filter(Boolean).length
                                const terminal = !isActive(bid)
                                // A declined bid never had figures; a WITHDRAWN one has them
                                // removed by the server (null total and counts). Both render as
                                // em dashes rather than "SAR 0.00", which would read as a price.
                                const declined = bid.status === 'declined' || bid.totalSar <= 0
                                const checked = sel.includes(bid.id)
                                const isBest = bestIds.includes(bid.id)
                                const isLowest = bid.id === bestIds[0]
                                return (
                                  <li
                                    key={bid.id}
                                    className={cn(
                                      BID_GRID,
                                      'py-3 transition-colors',
                                      terminal && 'opacity-50',
                                      isBest && 'bg-status-success-subtle',
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      disabled={terminal}
                                      onChange={() => toggleBid(rfq.id, bid.id)}
                                      aria-label={bid.bidder}
                                      className="h-4 w-4 cursor-pointer accent-brand-primary disabled:cursor-not-allowed"
                                    />
                                    <span className="truncate text-sm font-semibold text-content-primary">{bid.bidder}</span>
                                    {/* A decline is not a bid — there is no price, coverage or date
                                        to report, so every figure reads as a dash. */}
                                    <span
                                      className={cn(
                                        'text-sm font-semibold',
                                        declined
                                          ? 'text-content-tertiary'
                                          : isLowest
                                            ? 'text-status-success-strong'
                                            : 'text-content-primary',
                                      )}
                                    >
                                      {declined ? '—' : formatSar(toHalalas(bid.totalSar), { locale: i18n.language })}
                                    </span>
                                    <span className="text-sm text-content-secondary">
                                      {declined ? '—' : t('rfq.bidsInbox.nOfM', { n: bid.itemsCovered, m: bid.itemsTotal })}
                                    </span>
                                    <span className="text-sm text-content-secondary">
                                      {declined ? '—' : dateShort(bid.deliveryDate)}
                                    </span>
                                    <span className="text-sm text-content-secondary">
                                      {declined ? '—' : t('rfq.bidsInbox.nOfM', { n: compliantCount, m: certTotal })}
                                    </span>
                                    <span className={cn('justify-self-start text-sm font-medium', BID_TEXT_TONE[bid.status])}>
                                      {t(`rfq.detail.bidStatus.${bid.status}`)}
                                    </span>
                                    <span className="justify-self-end">
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        disabled={terminal}
                                        onClick={() => navigate(`/buyer/negotiations/${rfq.id}/${bid.id}`)}
                                      >
                                        {t('rfq.bidsInbox.col.negotiate')}
                                      </Button>
                                    </span>
                                  </li>
                                )
                              })}
                            </ul>
                          </div>
                        </div>

                        {/* Compare footer */}
                        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                          <p className="text-xs text-content-tertiary">
                            {t('rfq.bidsInbox.bestNote', {
                              highlighted: bestIds.length,
                              selected: sel.length,
                              total: bids.length,
                            })}
                          </p>
                          <Button
                            className="mp-press"
                            disabled={sel.length === 0}
                            onClick={() => navigate(`/buyer/rfqs/${rfq.id}/compare?bids=${sel.join(',')}`)}
                          >
                            {t('rfq.bidsInbox.compareSelected', { n: sel.length })}
                          </Button>
                        </div>
                      </div>
                    )}
                  </li>
                )
              })}
              </ul>
            </div>
          )}
        </>
      )}
    </section>
  )
}
