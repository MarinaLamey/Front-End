import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Input } from '@/shared/ui/Input'

export type ValidationStatus = 'idle' | 'validating' | 'valid' | 'invalid'

interface ValidationCardProps {
  label: string
  placeholder?: string
  value: string
  onChange: (value: string) => void
  onValidate: () => void
  status: ValidationStatus
  /** Business name on success, or the failure reason on invalid. */
  message?: string
}

/**
 * A single registration input (CR or VAT) with its own validate action and outcome.
 * Self-contained so multiple cards run independent loading states side by side.
 */
export function ValidationCard({
  label,
  placeholder,
  value,
  onChange,
  onValidate,
  status,
  message,
}: ValidationCardProps) {
  const { t } = useTranslation()

  return (
    <div className="space-y-2 rounded-lg border border-slate-200 p-4">
      <label className="text-sm font-medium text-content-primary">{label}</label>

      <div className="flex items-start gap-2">
        <div className="flex-1">
          <Input
            value={value}
            placeholder={placeholder}
            inputMode="numeric"
            aria-label={label}
            error={status === 'invalid' ? { title: message ?? t('common.loading') } : null}
            onChange={(event) => onChange(event.target.value)}
          />
        </div>
        <Button
          type="button"
          variant="secondary"
          onClick={onValidate}
          isLoading={status === 'validating'}
          disabled={!value.trim()}
        >
          {t('auth.validate')}
        </Button>
      </div>

      {status === 'valid' && (
        <p className="text-sm text-emerald-600">
          {t('auth.verified')}
          {message ? ` — ${message}` : ''} ✓
        </p>
      )}
      {status === 'invalid' && message && <p className="text-sm text-status-danger">{message}</p>}
    </div>
  )
}
