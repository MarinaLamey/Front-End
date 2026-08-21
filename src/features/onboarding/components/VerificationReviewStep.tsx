import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { BrandLogo } from '@/shared/ui/BrandLogo'
import { CheckIcon } from '@/shared/ui/dashboard'
import { LanguageToggle } from '@/platform/i18n'
import { ThemeToggle } from '@/platform/theme/ThemeToggle'

interface VerificationReviewStepProps {
  onGoToDashboard: () => void
}

/**
 * VerificationReviewStep — the post-submit confirmation screen (replaces the old Plans step).
 * A standalone screen (its own top-bar toggles, no wizard rail/panel) whose card is centered in
 * the MIDDLE of the viewport: logo top-start, a centered success check + "verification in review"
 * message, and a footer with the single Go-to-dashboard action. The KYB review runs in the
 * background, so there is nothing else to do here.
 */
export function VerificationReviewStep({ onGoToDashboard }: VerificationReviewStepProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-screen flex-col bg-bg-canvas px-5 py-6">
      <div className="flex shrink-0 justify-end gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>

      {/* Centered on both axes — the confirmation card sits in the middle of the screen. */}
      <div className="flex flex-1 items-center justify-center">
        <div className="flex w-full max-w-[1024px] flex-col overflow-hidden rounded-[24px] border border-border-subtle bg-bg-surface shadow-[0px_25px_50px_rgba(16,24,40,0.25),0px_20px_25px_rgba(16,24,40,0.10)] motion-safe:animate-card-in">
          <div className="px-6 py-5 sm:px-10 lg:px-12">
            <BrandLogo className="h-[60px] w-auto" />

            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success-subtle text-status-success shadow-sm">
                <CheckIcon className="h-6 w-6" />
              </span>
              <div>
                <h1 className="text-2xl font-semibold text-content-primary">
                  {t('onboarding.verificationReview.title')}
                </h1>
                <p className="mt-1.5 text-base text-content-secondary">
                  {t('onboarding.verificationReview.subtitle')}
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-end border-t border-border-subtle px-6 py-3.5 sm:px-10 lg:px-12">
            <Button onClick={onGoToDashboard}>{t('onboarding.verificationReview.goToDashboard')}</Button>
          </div>
        </div>
      </div>
    </div>
  )
}
