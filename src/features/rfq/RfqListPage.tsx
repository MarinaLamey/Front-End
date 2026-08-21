import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Pagination } from '@/shared/ui/Pagination'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { useRfqs } from './hooks/useRfqs'
import { useDeleteRfq } from './hooks/rfqQueries'
import { PlusIcon } from './create/components/icons'
import { RfqActionDialog } from './detail/RfqActionDialog'
import { isNegotiating } from './detail/deriveRfqDetail'
import { categoryLabel, type RfqDraft, type RfqStatus } from './types'

/** A Live RFQ the buyer has opened a negotiation on reads as "Negotiating" in the list. */
const STATUS_TONE: Record<RfqStatus, string> = {
  draft: 'bg-bg-surface-sunken text-content-secondary',
  awaiting_verification: 'bg-status-warning-subtle text-status-warning-strong',
  live: 'bg-status-success-subtle text-status-success-strong',
  awarded: 'bg-brand-subtle text-brand-strong',
  partially_awarded: 'bg-brand-subtle text-brand-strong',
  cancelled: 'bg-status-danger-subtle text-status-danger',
  expired: 'bg-bg-surface-sunken text-content-tertiary',
}

/**
 * Status filters, in the Figma's order. `negotiating` is not a stored status — it is the derived
 * state of a live RFQ the buyer has opened a negotiation on — so it filters and counts through
 * {@link isNegotiating} rather than a status compare, and `live` excludes those same rows so the
 * two chips never double-count the same RFQ.
 */
const FILTERS = [
  'all',
  'live',
  'awaiting_verification',
  'negotiating',
  'awarded',
  'cancelled',
  'expired',
  'draft',
] as const
type Filter = (typeof FILTERS)[number]

const PAGE_SIZES = [25, 50, 100]

/** The single action a non-draft row offers, by status (drafts show Resume + Delete). */
const ACTION: Record<RfqStatus, 'view' | 'resume'> = {
  live: 'view',
  draft: 'resume',
  awaiting_verification: 'view',
  awarded: 'view',
  partially_awarded: 'view',
  cancelled: 'view',
  expired: 'view',
}

/** Scope toggle — "My RFQs" vs the whole organisation's. */
const SCOPES = ['mine', 'organisation'] as const
type Scope = (typeof SCOPES)[number]

const GRID = 'grid grid-cols-[minmax(200px,2.4fr)_1.3fr_64px_1.1fr_128px_150px] items-center gap-4'

export function RfqListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()
  const del = useDeleteRfq()
  const [filter, setFilter] = useState<Filter>('all')
  const [scope, setScope] = useState<Scope>('mine')
  const [toDelete, setToDelete] = useState<RfqDraft | null>(null)
  // One clock reading per mount, so every row's countdown is measured from the same instant.
  const [now] = useState(() => Date.now())

  // Page + rows-per-page live in the URL so a page is shareable and survives a refresh.
  const [searchParams, setSearchParams] = useSearchParams()
  const sizeParam = Number(searchParams.get('size'))
  const pageSize = PAGE_SIZES.includes(sizeParam) ? sizeParam : PAGE_SIZES[0]
  const pageParam = Number(searchParams.get('page'))
  const requestedPage = Number.isFinite(pageParam) && pageParam > 0 ? Math.floor(pageParam) : 1

  const setParams = (next: { page?: number; size?: number }) => {
    const params = new URLSearchParams(searchParams)
    if (next.size !== undefined) params.set('size', String(next.size))
    if (next.page !== undefined) params.set('page', String(next.page))
    setSearchParams(params, { replace: true })
  }
  // Changing the filter or scope re-bases the result set, so send the reader back to page 1.
  const changeFilter = (next: Filter) => {
    setFilter(next)
    setParams({ page: 1 })
  }
  const changeScope = (next: Scope) => {
    setScope(next)
    setParams({ page: 1 })
  }

  // One pass over the list. A negotiating RFQ is deliberately kept OUT of the `live` tally so the
  // two chips partition the live set rather than double-counting the same row, and the two awarded
  // statuses share one chip because the buyer thinks of them as a single outcome.
  const counts = useMemo(() => {
    const c: Record<Exclude<Filter, 'all'>, number> = {
      live: 0,
      awaiting_verification: 0,
      negotiating: 0,
      awarded: 0,
      cancelled: 0,
      expired: 0,
      draft: 0,
    }
    for (const rfq of data) {
      if (isNegotiating(rfq)) c.negotiating += 1
      else if (rfq.status === 'live') c.live += 1
      else if (rfq.status === 'awarded' || rfq.status === 'partially_awarded') c.awarded += 1
      else if (rfq.status === 'awaiting_verification') c.awaiting_verification += 1
      else if (rfq.status === 'cancelled') c.cancelled += 1
      else if (rfq.status === 'expired') c.expired += 1
      else if (rfq.status === 'draft') c.draft += 1
    }
    return c
  }, [data])

  /** Row ↔ chip membership. Mirrors {@link counts} exactly, so a chip's number always matches its list. */
  const matchesFilter = (rfq: RfqDraft, key: Filter) => {
    switch (key) {
      case 'all':
        return true
      case 'negotiating':
        return isNegotiating(rfq)
      case 'live':
        return rfq.status === 'live' && !isNegotiating(rfq)
      case 'awarded':
        return rfq.status === 'awarded' || rfq.status === 'partially_awarded'
      default:
        return rfq.status === key
    }
  }

  // "All organisation" is a mock toggle for now — it shows the same list until org ownership lands.
  const scoped = data
  const rows = filter === 'all' ? scoped : scoped.filter((rfq) => matchesFilter(rfq, filter))

  // View-level pagination over the projected list (Zero-Fetch keeps the whole set in cache).
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize))
  const page = Math.min(requestedPage, totalPages)
  const pagedRows = rows.slice((page - 1) * pageSize, page * pageSize)

  // Filtering/resizing can drop the row count below the current page — pull the URL back in range.
  useEffect(() => {
    if (requestedPage > totalPages) setParams({ page: totalPages })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestedPage, totalPages])

  const shortDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso))
  const daysAgo = (iso: string) => Math.max(0, Math.round((now - new Date(iso).getTime()) / 86_400_000))
  const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - now) / 86_400_000)

  const subtitleFor = (rfq: RfqDraft) => {
    const base =
      rfq.status === 'draft'
        ? t('rfq.list.edited', {
            time:
              daysAgo(rfq.updatedAt) === 0
                ? t('rfq.list.today')
                : t('rfq.list.daysAgo', { count: daysAgo(rfq.updatedAt) }),
          })
        : t('rfq.list.created', { date: shortDate(rfq.createdAt) })
    // A split award is the one thing about a resolved row the buyer can't infer from its title.
    const awards = rfq.awards?.length ?? 0
    return awards > 1 ? `${base} · ${t('rfq.list.splitAward', { count: awards })}` : base
  }

  const closingFor = (rfq: RfqDraft) => {
    if (rfq.status === 'draft') return t('rfq.list.closing.notPublished')
    // Not live yet — it has no countdown to run because it publishes on verification, not on a date.
    if (rfq.status === 'awaiting_verification') return t('rfq.list.closing.publishesWhenVerified')
    if (rfq.status === 'live') {
      const days = daysUntil(rfq.closingDate)
      return days > 0 ? t('rfq.list.closing.inDays', { count: days }) : t('rfq.list.closing.closed')
    }
    return t('rfq.list.closing.closed')
  }

  const openRfq = (rfq: RfqDraft) =>
    rfq.status === 'draft' ? navigate('/buyer/rfqs/new') : navigate(`/buyer/rfqs/${rfq.id}`)

  const confirmDelete = () => {
    if (!toDelete) return
    del.mutate(toDelete.id, { onSuccess: () => setToDelete(null) })
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.title')}</h1>
          <p className="mt-1 text-sm text-content-secondary">{t('rfq.list.subtitle')}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Scope toggle — My RFQs / All organisation. */}
          <div className="flex rounded-lg border border-border-subtle bg-bg-surface p-0.5 text-sm">
            {SCOPES.map((s) => (
              <button
                key={s}
                type="button"
                aria-pressed={scope === s}
                onClick={() => changeScope(s)}
                className={cn(
                  'cursor-pointer rounded-md px-3 py-1.5 font-medium transition-colors',
                  scope === s
                    ? 'bg-brand-subtle text-brand-primary'
                    : 'text-content-secondary hover:text-content-primary',
                )}
              >
                {t(`rfq.list.scope.${s}`)}
              </button>
            ))}
          </div>
          <Button leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('/buyer/rfqs/new')}>
            {t('rfq.list.createRfq')}
          </Button>
        </div>
      </div>

      {/* Status filter pills with counts. */}
      <div className="mt-5 flex flex-wrap gap-2">
        {FILTERS.map((key) => {
          const active = filter === key
          const label = key === 'all' ? t('rfq.list.all') : t(`rfq.statusLabel.${key}`)
          const count = key === 'all' ? data.length : counts[key]
          return (
            <button
              key={key}
              type="button"
              onClick={() => changeFilter(key)}
              className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors',
                active
                  ? 'border-brand-primary bg-brand-primary text-brand-primary-on'
                  : 'border-border-subtle text-content-secondary hover:border-border-default hover:text-content-primary',
              )}
            >
              {label}
              <span className={cn('text-xs font-semibold', active ? 'text-brand-primary-on/80' : 'text-content-tertiary')}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface shadow-sm">
        {isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Spinner />
          </div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <p className="text-base font-semibold text-content-primary">{t('rfq.list.empty')}</p>
            <p className="max-w-xs text-sm text-content-secondary">{t('rfq.list.emptyHint')}</p>
            <Button className="mt-1" onClick={() => navigate('/buyer/rfqs/new')}>
              {t('rfq.list.createRfq')}
            </Button>
          </div>
        ) : (
          <>
          <div className="overflow-x-auto">
            <div className="min-w-[820px] px-5">
              <div className={cn(GRID, 'border-b border-border-subtle py-3')}>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.rfq')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.category')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.bids')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.closing')}</span>
                <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.status')}</span>
                <span className="sr-only">{t('rfq.list.columns.action')}</span>
              </div>

              <ul key={page} className="divide-y divide-border-subtle motion-safe:animate-page-in">
                {pagedRows.map((rfq) => (
                  <li
                    key={rfq.id}
                    onClick={() => openRfq(rfq)}
                    className={cn(GRID, 'cursor-pointer py-3.5 transition-colors hover:bg-bg-surface-sunken')}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-content-primary">
                        {rfq.title || t('rfq.list.untitled')}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-content-tertiary">
                        {rfq.reference} · {subtitleFor(rfq)}
                      </p>
                    </div>
                    <span className="truncate text-sm text-content-secondary">
                      {categoryLabel(rfq.categories) || '—'}
                    </span>
                    <span className="text-sm font-medium text-content-primary">
                      {rfq.status === 'draft' ? '—' : rfq.bids}
                    </span>
                    <span className="truncate text-sm text-content-secondary">{closingFor(rfq)}</span>
                    <span>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                          isNegotiating(rfq) ? 'bg-status-info-subtle text-status-info' : STATUS_TONE[rfq.status],
                        )}
                      >
                        {isNegotiating(rfq) ? t('rfq.statusLabel.negotiating') : t(`rfq.statusLabel.${rfq.status}`)}
                      </span>
                    </span>
                    <span className="flex items-center justify-end gap-3">
                      {rfq.status === 'draft' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setToDelete(rfq)
                          }}
                          className="cursor-pointer text-sm font-medium text-status-danger hover:text-status-danger-strong"
                        >
                          {t('rfq.list.actions.delete')}
                        </button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          openRfq(rfq)
                        }}
                      >
                        {t(`rfq.list.actions.${ACTION[rfq.status]}`)}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {/* The footer only earns its space once the list actually spills a page. */}
          {rows.length > pageSize && (
            <Pagination
              page={page}
              pageSize={pageSize}
              total={rows.length}
              pageSizeOptions={PAGE_SIZES}
              onPageChange={(p) => setParams({ page: p })}
              onPageSizeChange={(size) => setParams({ size, page: 1 })}
              className="border-t border-border-subtle"
            />
          )}
          </>
        )}
      </div>

      <RfqActionDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={del.isPending}
        title={t('rfq.list.deleteDialog.title')}
        badge={toDelete ? { text: toDelete.reference, tone: 'neutral' } : undefined}
        body={t('rfq.list.deleteDialog.body')}
        callout={{
          heading: t('rfq.list.deleteDialog.calloutHeading'),
          tone: 'danger',
          bullets: t('rfq.list.deleteDialog.bullets', { returnObjects: true }) as string[],
        }}
        confirmLabel={t('rfq.list.deleteDialog.confirm')}
        confirmTone="danger"
        cancelLabel={t('rfq.list.deleteDialog.cancel')}
      />
    </section>
  )
}
