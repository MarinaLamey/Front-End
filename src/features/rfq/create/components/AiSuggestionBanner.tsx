import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { SparkleIcon } from './icons'

interface AiSuggestionBannerProps {
  body: string
  onApply: () => void
}

/** The dismissible "AI suggestions" prompt under step 1 (advisory; applying is optional). */
export function AiSuggestionBanner({ body, onApply }: AiSuggestionBannerProps) {
  const { t } = useTranslation()
  return (
    <div className="flex items-center gap-3 rounded-xl bg-brand-subtle p-4">
      <span className="mt-0.5 shrink-0 text-status-ai">
        <SparkleIcon className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-content-primary">{t('rfq.create.ai.title')}</p>
        <p className="mt-0.5 text-sm text-content-secondary">{body}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onApply}>
        {t('rfq.create.ai.apply')}
      </Button>
    </div>
  )
}
