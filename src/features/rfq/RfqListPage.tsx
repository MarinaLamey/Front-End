import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { useRfqs } from './hooks/useRfqs'
import type { RfqStatus } from './types'

const STATUS_TONE: Record<RfqStatus, string> = {
  draft: 'bg-bg-surface-sunken text-content-secondary',
  pending_approval: 'bg-status-warning-subtle text-status-warning-strong',
  open: 'bg-status-success-subtle text-status-success-strong',
  awarded: 'bg-brand-subtle text-brand-strong',
  closed: 'bg-bg-surface-sunken text-content-tertiary',
}

export function RfqListPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { data = [], isLoading } = useRfqs()

  const formatDate = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', year: 'numeric' }).format(
      new Date(iso),
    )

  return (
    <section className="mx-auto w-full max-w-4xl space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.title')}</h1>
        <Button onClick={() => navigate('/buyer/rfqs/new')}>{t('rfq.newRfq')}</Button>
      </div>

      {isLoading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : data.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface py-16 text-center">
          <p className="text-base font-semibold text-content-primary">{t('rfq.list.empty')}</p>
          <p className="max-w-xs text-sm text-content-secondary">{t('rfq.list.emptyHint')}</p>
          <Button className="mt-1" onClick={() => navigate('/buyer/rfqs/new')}>
            {t('rfq.newRfq')}
          </Button>
        </div>
      ) : (
        <ul className="divide-y divide-border-subtle overflow-hidden rounded-xl border border-border-subtle bg-bg-surface">
          {data.map((rfq) => (
            <li
              key={rfq.id}
              className="flex cursor-pointer items-center justify-between gap-4 px-4 py-3.5 transition-colors hover:bg-bg-surface-sunken"
              onClick={() => navigate('/buyer/rfqs/new')}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-semibold text-content-primary">
                    {rfq.title || t('rfq.list.untitled')}
                  </span>
                  <span
                    className={cn(
                      'shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold',
                      STATUS_TONE[rfq.status],
                    )}
                  >
                    {t(`rfq.statusLabel.${rfq.status}`)}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-xs text-content-tertiary">
                  {rfq.reference}
                  {rfq.category ? ` · ${rfq.category}` : ''}
                </p>
              </div>
              <span className="shrink-0 text-xs text-content-tertiary">
                {t('rfq.list.updated', { date: formatDate(rfq.updatedAt) })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
