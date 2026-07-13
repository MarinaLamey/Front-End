import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

interface PagePlaceholderProps {
  title: string
  description?: string
  children?: ReactNode
}

/** Lightweight page scaffold for routes whose real UI is still pending designs. */
export function PagePlaceholder({ title, description, children }: PagePlaceholderProps) {
  const { t } = useTranslation()

  return (
    <section className="space-y-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-content-primary">{title}</h1>
        {description && <p className="mt-1 text-sm text-content-tertiary">{description}</p>}
      </div>
      {children ?? (
        <div className="rounded-lg border border-dashed border-slate-300 p-10 text-center text-sm text-slate-400">
          {t('common.comingSoon')}
        </div>
      )}
    </section>
  )
}
