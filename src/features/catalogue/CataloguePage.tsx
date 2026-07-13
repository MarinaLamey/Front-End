import { useTranslation } from 'react-i18next'
import { useCatalogue } from './hooks/useCatalogue'

export function CataloguePage() {
  const { t } = useTranslation()
  const { data, isLoading, isError } = useCatalogue()

  return (
    <section className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">
          {t('catalogue.title')}
        </h1>
        <p className="mt-1 text-sm text-content-tertiary">{t('catalogue.subtitle')}</p>
      </div>

      {isError && <p className="text-sm text-status-danger">{t('catalogue.loadError')}</p>}

      <div className="grid gap-3 sm:grid-cols-2">
        {isLoading
          ? Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="h-24 animate-pulse rounded-lg border border-slate-200 bg-white"
              />
            ))
          : data?.map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-content-primary">{item.name}</p>
                  {item.certified && (
                    <span className="shrink-0 rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700">
                      {t('catalogue.certified')}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-sm text-content-tertiary">
                  {item.category} · {item.supplier}
                </p>
              </div>
            ))}
      </div>
    </section>
  )
}
