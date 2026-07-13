import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { useRfqs } from './hooks/useRfqs'

export function RfqListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = useRfqs()

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('rfq.title')}</h1>
        <Button onClick={() => navigate('/buyer/rfqs/new')}>{t('rfq.newRfq')}</Button>
      </div>

      {isLoading ? (
        <p className="text-sm text-content-tertiary">{t('common.loading')}</p>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-lg border border-slate-200 bg-white">
          {data?.map((rfq) => (
            <li key={rfq.id} className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-content-primary">{rfq.title}</span>
              <span className="text-xs uppercase tracking-wide text-content-tertiary">
                {rfq.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
