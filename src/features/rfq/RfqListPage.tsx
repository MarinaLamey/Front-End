import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { useRfqs } from './hooks/useRfqs'
import type { RfqDraft, RfqStatus } from './types'

const STATUS_TONE: Record<RfqStatus, string> = {
  draft: 'bg-bg-surface-sunken text-content-secondary',
  pending_approval: 'bg-status-warning-subtle text-status-warning-strong',
  open: 'bg-status-success-subtle text-status-success-strong',
  awarded: 'bg-brand-subtle text-brand-strong',
  closed: 'bg-bg-surface-sunken text-content-tertiary',
}

/** RFQ list filters — All plus one per status, in the order the Figma shows. */
const FILTERS = ['all', 'draft', 'pending_approval', 'open', 'closed', 'awarded'] as const
type Filter = (typeof FILTERS)[number]

/** Which action a row offers, by status. */
const ACTION: Record<RfqStatus, 'compare' | 'view' | 'resume'> = {
  open: 'compare',
  draft: 'resume',
  pending_approval: 'view',
  awarded: 'view',
  closed: 'view',
}

const GRID = 'grid grid-cols-[minmax(200px,2.4fr)_1.3fr_64px_1.1fr_128px_116px] items-center gap-4'

export function RfqListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()
  const [filter, setFilter] = useState<Filter>('all')

  const counts = useMemo(() => {
    const c: Record<RfqStatus, number> = { draft: 0, pending_approval: 0, open: 0, awarded: 0, closed: 0 }
    for (const rfq of data) c[rfq.status] += 1
    return c
  }, [data])

  const rows = filter === 'all' ? data : data.filter((rfq) => rfq.status === filter)

  const shortDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso))
  const daysAgo = (iso: string) =>
    Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86_400_000))
  const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)

  const subtitleFor = (rfq: RfqDraft) =>
    rfq.status === 'draft'
      ? t('rfq.list.edited', {
          time:
            daysAgo(rfq.updatedAt) === 0
              ? t('rfq.list.today')
              : t('rfq.list.daysAgo', { count: daysAgo(rfq.updatedAt) }),
        })
      : t('rfq.list.created', { date: shortDate(rfq.createdAt) })

  const closingFor = (rfq: RfqDraft) => {
    if (rfq.status === 'draft') return t('rfq.list.closing.notPublished')
    if (rfq.status === 'pending_approval') return t('rfq.list.closing.awaitingAdmin')
    if (rfq.status === 'open') {
      const days = daysUntil(rfq.closingDate)
      return days > 0 ? t('rfq.list.closing.inDays', { count: days }) : t('rfq.list.closing.closed')
    }
    return t('rfq.list.closing.closed')
  }

  const onAction = (rfq: RfqDraft) => {
    if (ACTION[rfq.status] === 'resume') navigate('/buyer/rfqs/new')
    else navigate('/buyer/bids')
  }

  return (
    <section className="mx-auto w-full max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.title')}</h1>
          <p className="mt-1 text-sm text-content-secondary">{t('rfq.list.subtitle')}</p>
        </div>
        <Button onClick={() => navigate('/buyer/rfqs/new')}>{t('rfq.list.createRfq')}</Button>
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
              onClick={() => setFilter(key)}
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

      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface">
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

              <ul className="divide-y divide-border-subtle">
                {rows.map((rfq) => (
                  <li key={rfq.id} className={cn(GRID, 'py-3.5')}>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-content-primary">
                        {rfq.title || t('rfq.list.untitled')}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-content-tertiary">
                        {rfq.reference} · {subtitleFor(rfq)}
                      </p>
                    </div>
                    <span className="truncate text-sm text-content-secondary">{rfq.category || '—'}</span>
                    <span className="text-sm font-medium text-content-primary">
                      {rfq.status === 'draft' ? '—' : rfq.bids}
                    </span>
                    <span className="truncate text-sm text-content-secondary">{closingFor(rfq)}</span>
                    <span>
                      <span
                        className={cn(
                          'inline-flex rounded-full px-2 py-0.5 text-xs font-semibold',
                          STATUS_TONE[rfq.status],
                        )}
                      >
                        {t(`rfq.statusLabel.${rfq.status}`)}
                      </span>
                    </span>
                    <span className="flex justify-end">
                      <Button variant="outline" size="sm" onClick={() => onAction(rfq)}>
                        {t(`rfq.list.actions.${ACTION[rfq.status]}`)}
                      </Button>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
