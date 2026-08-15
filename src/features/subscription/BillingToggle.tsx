import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import type { Billing } from './planData'

interface BillingToggleProps {
  value: Billing
  onChange: (value: Billing) => void
  /** Show the "Save ~20%" note under the toggle when annual is picked (default true). */
  showSave?: boolean
  className?: string
}

/**
 * BillingToggle — the shared monthly⇄annual pill used by the dashboard Subscription page.
 * Purely controlled; the parent owns the `billing` state.
 */
export function BillingToggle({ value, onChange, showSave = true, className }: BillingToggleProps) {
  const { t } = useTranslation()
  return (
    <div className={cn('flex flex-col items-end gap-1', className)}>
      <div className="flex rounded-full bg-bg-surface-sunken p-1">
        {(['monthly', 'annual'] as Billing[]).map((option) => (
          <button
            key={option}
            type="button"
            aria-pressed={value === option}
            onClick={() => onChange(option)}
            className={cn(
              'rounded-full px-4 py-1.5 text-sm transition-colors motion-reduce:transition-none',
              value === option
                ? 'bg-bg-surface font-semibold text-content-primary shadow-sm'
                : 'text-content-tertiary hover:text-content-secondary',
            )}
          >
            {t(`plans.${option}`)}
          </button>
        ))}
      </div>
      {showSave && value === 'annual' && (
        <span className="text-xs font-semibold text-status-success">{t('plans.save')}</span>
      )}
    </div>
  )
}
