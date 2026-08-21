import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { useOrders } from '@/features/orders/hooks/orderQueries'
import { useRfqs } from '../hooks/useRfqs'
import { deriveRfqDetail } from '../detail/deriveRfqDetail'
import { supplierDisplayName } from '../identity'
import { getThread } from './deriveNegotiation'
import {
  NEGOTIATION_STATES,
  negotiationActivity,
  negotiationState,
  negotiationStateKey,
  negotiationStateTone,
  type NegotiationState,
} from './negotiationState'

// Narrow columns fixed so the header grid and the row grids resolve to identical tracks; the
// status track holds the longest badge ("Awaiting you") on one line. The RFQ column carries two
// lines of text and is the one that must not be squeezed.
const GRID =
  'grid grid-cols-[minmax(220px,3fr)_minmax(120px,1.1fr)_72px_minmax(100px,0.9fr)_150px_104px] items-center gap-4'

/**
 * Where a thread stands, from the BUYER's side — the five states of SoT §2.1:
 * Awaiting supplier · Awaiting you · Agreed — issue the order · Awarded · Closed.
 *
 * The older Active / Awaiting you / Closed set is gone. §2.1 flags it as a design conflict, and the
 * worst of it was that `agreed` had to be smuggled in as "Awaiting you": a conversation both sides
 * have settled but which has not yet produced an order is its own state, and folding it into a
 * turn-based word hid the single most actionable thing on the page — a purchase order waiting to be
 * issued from terms already agreed.
 */
type Chip = NegotiationState
const FILTERS = ['all', ...NEGOTIATION_STATES] as const
type Filter = (typeof FILTERS)[number]

interface Row {
  rfqId: string
  reference: string
  title: string
  bidId: string
  supplierLabel: string
  round: number
  updatedAt: string
  chip: Chip
  /** The activity sentence that sits beside the status (SoT §2). */
  activity: { key: string; version: number }
}

/** NegotiationsInboxPage — the "Negotiations" nav destination: every buyer↔supplier thread. */
export function NegotiationsInboxPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()
  const { data: orders = [] } = useOrders()
  const [filter, setFilter] = useState<Filter>('all')
  // One clock reading per mount, so every row's "last activity" is measured from the same instant.
  const [now] = useState(() => Date.now())

  // Identity is exchanged when the supplier ACCEPTS their purchase order, so acceptance — not the
  // award, and certainly not the end of a conversation — is what unmasks a row.
  const acceptedPos = useMemo(() => {
    const accepted = new Set<string>()
    for (const order of orders) {
      if (order.status !== 'awaiting_acceptance' && order.status !== 'cancelled' && order.status !== 'declined') {
        accepted.add(order.poNumber)
      }
    }
    return accepted
  }, [orders])

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const rfq of data) {
      // Threads run on live RFQs; once the buyer counters / ends / awards they persist on the RFQ.
      if (rfq.status !== 'live' && !rfq.negotiations) continue
      const detail = deriveRfqDetail(rfq)
      for (const bid of detail.bids) {
        const persisted = rfq.negotiations?.[bid.id]
        // A real thread exists only once negotiation has started (seeded) or been persisted.
        if (!persisted && bid.status !== 'negotiating') continue
        const thread = getThread(rfq, detail, bid)
        const last = thread.offers[thread.offers.length - 1]
        // Whose turn it is. `agreed` is deliberately NOT closed — the supplier has accepted and the
        // award is the buyer's to make, so the thread still needs you.
        const chip: Chip = negotiationState(thread, 'buyer')
        const activity = negotiationActivity(thread, 'buyer')
        out.push({
          rfqId: rfq.id,
          reference: rfq.reference,
          title: rfq.title || t('rfq.list.untitled'),
          bidId: bid.id,
          // Masked until the awarded supplier accepts their purchase order — a closed or still-open
          // conversation was never accepted, so its row stays a label.
          supplierLabel: supplierDisplayName(rfq, bid.id, thread.supplierLabel, acceptedPos),
          // The last offer's version, matching the thread page's own "Round n" chip.
          round: last?.version ?? thread.offers.length,
          updatedAt: thread.updatedAt,
          chip,
          activity,
        })
      }
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [data, t, acceptedPos])

  const counts = useMemo(() => {
    const c = Object.fromEntries(FILTERS.map((k) => [k, 0])) as Record<Filter, number>
    c.all = rows.length
    for (const r of rows) c[r.chip] += 1
    return c
  }, [rows])

  const shown = filter === 'all' ? rows : rows.filter((r) => r.chip === filter)

  /**
   * Last activity, in the compact shape the column is sized for: "2h ago" / "3d ago" up close,
   * "Yesterday" for the one case a word reads better than a number, and an absolute "02 Aug" past
   * a week — a thread that last moved eleven days ago is a date, not a countdown.
   */
  const relTime = (iso: string) => {
    const mins = Math.round((now - new Date(iso).getTime()) / 60_000)
    const hours = Math.round(mins / 60)
    const days = Math.round(hours / 24)
    if (mins < 60) return t('rfq.nego.time.minsAgo', { n: Math.max(mins, 1) })
    if (hours < 24) return t('rfq.nego.time.hoursAgo', { n: hours })
    if (days === 1) {
      return new Intl.RelativeTimeFormat(i18n.language, { numeric: 'auto' }).format(-1, 'day')
    }
    if (days <= 7) return t('rfq.nego.time.daysAgo', { n: days })
    return new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso))
  }

  const openThread = (row: Row) => navigate(`/buyer/negotiations/${row.rfqId}/${row.bidId}`)

  return (
    <section className="mx-auto w-full max-w-6xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.nego.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('rfq.nego.inboxSubtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface shadow-sm py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('rfq.nego.empty')}</p>
          <p className="max-w-sm text-sm text-content-secondary">{t('rfq.nego.emptyHint')}</p>
          <Button className="mt-1" variant="outline" onClick={() => navigate('/buyer/bids')}>
            {t('rfq.bidsInbox.title')}
          </Button>
        </div>
      ) : (
        <>
          {/* Status filter pills with counts. */}
          <div className="flex flex-wrap gap-2">
            {FILTERS.map((key) => {
              const active = filter === key
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setFilter(key)}
                  className={cn(
                    'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'border-brand-primary bg-brand-primary text-brand-primary-on'
                      : 'border-border-subtle text-content-secondary hover:border-border-default hover:text-content-primary',
                  )}
                >
                  {key === 'all' ? t('rfq.nego.filter.all') : t(negotiationStateKey(key, 'buyer'))}
                  <span className={cn('text-xs font-semibold', active ? 'text-brand-primary-on/80' : 'text-content-tertiary')}>
                    {counts[key]}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface shadow-sm">
            {/* minimum tracks 766 + 5 gaps 80 + px-5 40 */}
            <div className="min-w-[886px] px-5">
              <div className={cn(GRID, 'border-b border-border-subtle py-3')}>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.rfq')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.nego.colSupplier')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.nego.colRound')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.nego.colLastActivity')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.nego.colStatus')}</span>
                <span className="sr-only">{t('rfq.list.columns.action')}</span>
              </div>

              {shown.length === 0 ? (
                <p className="py-12 text-center text-sm text-content-tertiary">{t('rfq.nego.empty')}</p>
              ) : (
                <ul className="auth-stagger divide-y divide-border-subtle">
                  {shown.map((row) => (
                    <li
                      key={`${row.rfqId}:${row.bidId}`}
                      onClick={() => openThread(row)}
                      className={cn(GRID, 'cursor-pointer py-3.5 transition-colors hover:bg-bg-surface-sunken')}
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-content-primary">{row.title}</p>
                        <p className="mt-0.5 truncate text-xs text-content-tertiary">{row.reference}</p>
                      </div>
                      <span className="truncate text-sm text-content-secondary">{row.supplierLabel}</span>
                      <span className="text-sm font-medium text-content-primary">{row.round}</span>
                      {/* SoT §2 — every list that shows a status also shows the activity sentence
                          beside it, so the row says what happened, not just how long ago. */}
                      <span className="truncate text-sm text-content-secondary">
                        {t(row.activity.key, { version: row.activity.version, po: row.reference })} ·{' '}
                        {relTime(row.updatedAt)}
                      </span>
                      <span>
                        <StatusBadge
                          label={t(negotiationStateKey(row.chip, 'buyer'))}
                          tone={negotiationStateTone(row.chip)}
                          dot={false}
                        />
                      </span>
                      <span className="flex justify-end">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            openThread(row)
                          }}
                        >
                          {row.chip === 'closed' ? t('rfq.nego.view') : t('rfq.nego.open')}
                        </Button>
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  )
}
