import { useTranslation } from 'react-i18next'
import { useAuth } from '@/platform/auth'

const SUMMARY = [
  { key: 'dashboard.openRfqs', value: '3' },
  { key: 'dashboard.activeBids', value: '12' },
  { key: 'dashboard.pendingSettlement', value: 'SAR 84,000' },
]

export function DashboardPage() {
  const { t } = useTranslation()
  const { user } = useAuth()

  return (
    <section className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          {t('dashboard.welcomeBack', { name: user?.name ?? '' })}
        </h1>
        <p className="mt-1 text-sm text-content-tertiary">{t('dashboard.atAGlance')}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {SUMMARY.map((card) => (
          <div key={card.key} className="rounded-lg border border-slate-200 bg-white p-5">
            <p className="text-sm text-content-tertiary">{t(card.key)}</p>
            <p className="mt-1 text-2xl font-semibold text-content-primary">{card.value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}
