import { type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { ArrowRightIcon } from './onboardingIcons'

interface WizardFooterProps {
  /** Show a Back control on the leading edge. */
  onBack?: () => void
  /** Custom leading content (overrides the default Back button). */
  leading?: ReactNode
  continueLabel: string
  /** 'submit' lets a form own the action; 'button' calls `onContinue`. */
  continueType?: 'button' | 'submit'
  onContinue?: () => void
  disabled?: boolean
  loading?: boolean
}

/** Shared wizard footer: a leading Back (or custom node) and a trailing primary action. */
export function WizardFooter({
  onBack,
  leading,
  continueLabel,
  continueType = 'button',
  onContinue,
  disabled,
  loading,
}: WizardFooterProps) {
  const { t } = useTranslation()

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        {leading ??
          (onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="inline-flex items-center gap-2 text-sm font-medium text-content-secondary hover:text-content-primary"
            >
              <ArrowRightIcon className="h-4 w-4 rotate-180 rtl:rotate-0" />
              {t('onboarding.back')}
            </button>
          ) : null)}
      </div>

      <Button
        type={continueType}
        onClick={continueType === 'button' ? onContinue : undefined}
        disabled={disabled}
        isLoading={loading}
        rightIcon={<ArrowRightIcon className="h-4 w-4 rtl:rotate-180" />}
      >
        {continueLabel}
      </Button>
    </div>
  )
}
