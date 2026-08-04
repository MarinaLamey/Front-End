import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { useRfqs } from './hooks/useRfqs'
import type { RfqDraft } from './types'

const GRID = 'grid grid-cols-[minmax(200px,2.4fr)_1.2fr_96px_1fr_140px] items-center gap-4'

/**
 * BidsInboxPage — the "Bids" nav destination: the buyer's live RFQs that have attracted
 * offers, ready to compare. A focused slice of the RFQ list (status open, bids > 0),
 * soonest-closing first.
 */
export function BidsInboxPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()

  const rows = useMemo(
    () =>
      data
        .filter((rfq) => rfq.status === 'open' && rfq.bids > 0)
        .sort((a, b) => a.closingDate.localeCompare(b.closingDate)),
    [data],
  )

  const daysUntil = (iso: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0)
  const closingText = (rfq: RfqDraft) => {
    const days = daysUntil(rfq.closingDate)
    return days > 0 ? t('rfq.list.closing.inDays', { count: days }) : t('rfq.list.closing.closed')
  }

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.bidsInbox.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('rfq.bidsInbox.subtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('rfq.bidsInbox.empty')}</p>
          <p className="max-w-sm text-sm text-content-secondary">{t('rfq.bidsInbox.emptyHint')}</p>
          <Button className="mt-1" variant="outline" onClick={() => navigate('/buyer/rfqs')}>
            {t('rfq.title')}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface">
          <div className="min-w-[720px] px-5">
            <div className={cn(GRID, 'border-b border-border-subtle py-3')}>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.rfq')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.category')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.detail.bidsReceived')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.closing')}</span>
              <span className="sr-only">{t('rfq.list.columns.action')}</span>
            </div>

            <ul className="divide-y divide-border-subtle">
              {rows.map((rfq) => (
                <li
                  key={rfq.id}
                  onClick={() => navigate(`/buyer/rfqs/${rfq.id}`)}
                  className={cn(GRID, 'cursor-pointer py-3.5 transition-colors hover:bg-bg-surface-sunken')}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content-primary">
                      {rfq.title || t('rfq.list.untitled')}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-content-tertiary">{rfq.reference}</p>
                  </div>
                  <span className="truncate text-sm text-content-secondary">{rfq.category || '—'}</span>
                  <span className="text-sm font-semibold text-content-primary">{rfq.bids}</span>
                  <span className="truncate text-sm text-content-secondary">{closingText(rfq)}</span>
                  <span className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/buyer/rfqs/${rfq.id}/compare`)
                      }}
                    >
                      {t('rfq.detail.compareBids')}
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
