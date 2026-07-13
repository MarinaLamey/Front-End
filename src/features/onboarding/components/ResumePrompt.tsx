import { useTranslation } from 'react-i18next'
import { StepFrame } from './StepFrame'
import { WizardFooter } from './WizardFooter'
import { ClockIcon } from './registerIcons'
import type { WizardStep } from '../useOnboardingWizard'

interface ResumePromptProps {
  step: WizardStep
  onResume: () => void
  onStartOver: () => void
}

/**
 * ResumePrompt — shown when a saved registration draft exists. Offers Resume (load the
 * draft) or Start over (discard it). Rendered inside the same OnboardingLayout, so the rail
 * already reflects how far they'd got.
 */
export function ResumePrompt({ step, onResume, onStartOver }: ResumePromptProps) {
  const { t } = useTranslation()

  return (
    <StepFrame
      title={t('onboarding.resume.title')}
      subtitle={t('onboarding.resume.subtitle')}
      footer={
        <WizardFooter
          leading={
            <button
              type="button"
              onClick={onStartOver}
              className="text-sm font-medium text-content-secondary hover:text-content-primary"
            >
              {t('onboarding.resume.startOver')}
            </button>
          }
          continueLabel={t('onboarding.resume.resume')}
          onContinue={onResume}
        />
      }
    >
      <div className="flex items-center gap-3 rounded-xl border border-border-subtle bg-bg-surface-sunken p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-brand-subtle text-brand-primary">
          <ClockIcon className="h-5 w-5" />
        </span>
        <p className="text-sm text-content-secondary">{t('onboarding.resume.onStep', { step })}</p>
      </div>
    </StepFrame>
  )
}
