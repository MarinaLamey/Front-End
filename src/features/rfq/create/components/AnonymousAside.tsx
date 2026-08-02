import { useTranslation } from 'react-i18next'
import { EyeOffIcon } from './icons'

/** The "You stay anonymous" reassurance card shown beside steps 1–3. */
export function AnonymousAside() {
  const { t } = useTranslation()
  return (
    <aside className="rounded-xl bg-brand-subtle p-4">
      <div className="flex items-center gap-2 text-brand-strong">
        <EyeOffIcon className="h-4 w-4" />
        <h3 className="text-sm font-semibold text-content-primary">
          {t('rfq.create.anonymous.title')}
        </h3>
      </div>
      <p className="mt-1.5 text-sm text-content-secondary">{t('rfq.create.anonymous.body')}</p>
    </aside>
  )
}
