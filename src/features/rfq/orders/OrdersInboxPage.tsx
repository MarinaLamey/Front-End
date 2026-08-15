import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useRfqs } from '../hooks/useRfqs'
import { orderNumber } from '../detail/award'
import type { RfqDraft } from '../types'

const GRID = 'grid grid-cols-[minmax(160px,1.6fr)_minmax(160px,2fr)_1.1fr_1.1fr_120px] items-center gap-4'

/** OrdersInboxPage — the "Orders" nav destination: every awarded RFQ, now a fulfilling order. */
export function OrdersInboxPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()

  const rows = useMemo(
    () =>
      data
        .filter((r: RfqDraft) => r.status === 'awarded' && r.awards?.[0])
        .sort((a, b) => (b.awards?.[0]?.awardedAt ?? '').localeCompare(a.awards?.[0]?.awardedAt ?? '')),
    [data],
  )

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateFull = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'

  return (
    <section className="mx-auto w-full max-w-5xl space-y-5 motion-safe:animate-card-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.order.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">{t('rfq.order.inboxSubtitle')}</p>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : rows.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('rfq.order.empty')}</p>
          <p className="max-w-sm text-sm text-content-secondary">{t('rfq.order.emptyHint')}</p>
          <Button className="mt-1" variant="outline" onClick={() => navigate('/buyer/rfqs')}>
            {t('rfq.title')}
          </Button>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border-subtle bg-bg-surface">
          <div className="min-w-[740px] px-5">
            <div className={cn(GRID, 'border-b border-border-subtle py-3')}>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.order.colOrder')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.order.colSupplier')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.order.colTotal')}</span>
              <span className="text-xs font-medium text-content-tertiary">{t('rfq.order.colDelivery')}</span>
              <span className="sr-only">{t('rfq.list.columns.action')}</span>
            </div>

            <ul className="auth-stagger divide-y divide-border-subtle">
              {rows.map((rfq) => {
                const a = rfq.awards![0]
                return (
                  <li
                    key={rfq.id}
                    onClick={() => navigate(`/buyer/orders/${rfq.id}`)}
                    className={cn(GRID, 'cursor-pointer py-3.5 transition-colors hover:bg-bg-surface-sunken')}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-content-primary">{orderNumber(rfq)}</p>
                      <p className="mt-0.5 truncate text-xs text-content-tertiary">{rfq.title || t('rfq.list.untitled')}</p>
                    </div>
                    <span className="truncate text-sm text-content-secondary">{a.identity.companyName}</span>
                    <span className="text-sm font-semibold text-content-primary">{money(a.agreedTotalSar)}</span>
                    <span className="truncate text-sm text-content-secondary">{dateFull(a.deliveryDate)}</span>
                    <span className="flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation()
                          navigate(`/buyer/orders/${rfq.id}`)
                        }}
                      >
                        {t('rfq.order.open')}
                      </Button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      )}
    </section>
  )
}
