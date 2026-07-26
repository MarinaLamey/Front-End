import { useTranslation } from 'react-i18next'
import { BarsIcon } from '@/shared/ui/dashboard'

/**
 * ComingSoonPage — placeholder for portal routes whose screens aren't built yet (RFQs, Bids,
 * Orders, Suppliers, …). Keeps the shell + nav navigable while only the dashboard is real.
 */
export function ComingSoonPage() {
  const { t } = useTranslation()
  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-bg-surface-sunken text-content-tertiary">
        <BarsIcon className="h-6 w-6" />
      </span>
      <h2 className="text-lg font-semibold text-content-primary">{t('dashboard.comingSoon')}</h2>
      <p className="text-sm text-content-tertiary">{t('dashboard.comingSoonBody')}</p>
    </div>
  )
}
