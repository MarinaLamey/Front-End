import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useRfqs } from '../hooks/useRfqs'
import { deriveRfqDetail } from '../detail/deriveRfqDetail'
import { awaitingSupplier, getThread, onTable } from './deriveNegotiation'
import type { RfqDraft } from '../types'

const GRID = 'grid grid-cols-[minmax(180px,2.2fr)_1.1fr_1.1fr_1.2fr_120px] items-center gap-4'

interface Row {
  rfqId: string
  reference: string
  title: string
  bidId: string
  supplierLabel: string
  total: number
  version: number
  status: 'awaiting' | 'yourTurn' | 'notYet'
  updatedAt: string
}

/** NegotiationsInboxPage — the "Negotiations" nav destination: every active buyer↔supplier thread. */
export function NegotiationsInboxPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()

  const rows = useMemo<Row[]>(() => {
    const out: Row[] = []
    for (const rfq of data.filter((r: RfqDraft) => r.status === 'open')) {
      const detail = deriveRfqDetail(rfq)
      for (const bid of detail.bids) {
        const persisted = rfq.negotiations?.[bid.id]
        const isActive = persisted ? persisted.status === 'active' : bid.status === 'negotiating'
        if (!isActive) continue
        const thread = getThread(rfq, detail, bid)
        const table = onTable(thread)
        out.push({
          rfqId: rfq.id,
          reference: rfq.reference,
          title: rfq.title || t('rfq.list.untitled'),
          bidId: bid.id,
          supplierLabel: thread.supplierLabel,
          total: table.totalSar,
          version: table.version,
          status: thread.offers.length === 1 ? 'notYet' : awaitingSupplier(thread) ? 'awaiting' : 'yourTurn',
          updatedAt: thread.updatedAt,
        })
      }
    }
    return out.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
  }, [data, t])

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const statusText = (s: Row['status']) =>
    s === 'awaiting' ? t('rfq.nego.also.awaiting') : s === 'yourTurn' ? t('rfq.nego.also.yourTurn') : t('rfq.nego.also.notYet')

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.nego.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('rfq.nego.inboxSubtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('rfq.nego.empty')}</p>
          <p className="max-w-sm text-sm text-content-secondary">{t('rfq.nego.emptyHint')}</p>
          <Button className="mt-1" variant="outline" onClick={() => navigate('/buyer/bids')}>
            {t('rfq.bidsInbox.title')}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface">
          <div className="min-w-[760px] px-5">
            <div className={cn(GRID, 'border-b border-border-subtle py-3')}>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.list.columns.rfq')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.nego.colSupplier')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.nego.colLatest')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.nego.colStatus')}</span>
              <span className="sr-only">{t('rfq.list.columns.action')}</span>
            </div>

            <ul className="auth-stagger divide-y divide-border-subtle">
              {rows.map((row) => (
                <li
                  key={`${row.rfqId}:${row.bidId}`}
                  onClick={() => navigate(`/buyer/negotiations/${row.rfqId}/${row.bidId}`)}
                  className={cn(GRID, 'cursor-pointer py-3.5 transition-colors hover:bg-bg-surface-sunken')}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-content-primary">{row.title}</p>
                    <p className="mt-0.5 truncate text-xs text-content-tertiary">{row.reference}</p>
                  </div>
                  <span className="truncate text-sm text-content-secondary">{row.supplierLabel}</span>
                  <span className="text-sm font-semibold text-content-primary">
                    {money(row.total)} <span className="font-normal text-content-tertiary">· v{row.version}</span>
                  </span>
                  <span className="truncate text-sm text-content-secondary">{statusText(row.status)}</span>
                  <span className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(`/buyer/negotiations/${row.rfqId}/${row.bidId}`)
                      }}
                    >
                      {t('rfq.nego.open')}
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
