import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'

export function NotFoundPage() {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-slate-50 text-center">
      <h1 className="text-3xl font-bold text-content-primary">{t('common.notFoundTitle')}</h1>
      <p className="text-sm text-content-tertiary">{t('common.notFoundBody')}</p>
      <Link to="/" className="text-sm text-content-link hover:text-content-link-hover">
        {t('common.goHome')}
      </Link>
    </div>
  )
}
