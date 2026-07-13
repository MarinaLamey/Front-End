import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { OtpField, useOtp } from '@/shared/ui/OtpField'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import type { OnboardingData } from '../../useOnboardingWizard'

type Channel = 'phone' | 'email'

interface VerifyStepProps {
  channel: Channel
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const DEMO_CODE = '1234'

/** Mask a mobile to `+966 •••• 5678` for the "we sent a code to …" line. */
function maskMobile(mobile: string): string {
  const last4 = mobile.replace(/\D/g, '').slice(-4)
  return `+966 •••• ${last4 || 'xxxx'}`
}

/**
 * VerifyStep — steps 2 & 3. One component parameterised by channel (phone → email): a 4-digit
 * segmented OTP that VERIFIES AUTOMATICALLY once the last cell is filled — there is no Verify
 * button. A correct code (mock: 1234) marks the channel verified; a wrong one clears all four
 * cells and refocuses the first (via the remount `key`) so the user can retype. Continue
 * unlocks once this channel is verified.
 */
export function VerifyStep({ channel, data, patch, onNext, onBack }: VerifyStepProps) {
  const { t } = useTranslation()
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bumped on a wrong code → remounts OtpField, which clears the boxes and refocuses the first.
  const [attempt, setAttempt] = useState(0)
  const otp = useOtp()

  const verified = channel === 'phone' ? data.phoneVerified : data.emailVerified
  const destination = channel === 'phone' ? maskMobile(data.mobile) : data.email || 'your email'

  // Auto-verify the completed code (called from onChange when the 4th digit lands).
  const runVerify = (code: string) => {
    if (code.length !== otp.length || verifying || verified) return
    setVerifying(true)
    setError(null)
    // Mock verification — a short delay drives the synchronized loader, then 1234 passes.
    window.setTimeout(() => {
      setVerifying(false)
      if (code !== DEMO_CODE) {
        setError(t('onboarding.verify.invalid'))
        otp.setCode('') // wipe what the user typed…
        setAttempt((n) => n + 1) // …and refocus the first cell for a fresh try.
        return
      }
      patch(channel === 'phone' ? { phoneVerified: true } : { emailVerified: true })
    }, 1100)
  }

  return (
    <StepFrame
      title={t(`onboarding.verify.${channel}Title`)}
      subtitle={t(`onboarding.verify.${channel}Subtitle`)}
      footer={
        <WizardFooter onBack={onBack} continueLabel={t('onboarding.continue')} onContinue={onNext} disabled={!verified} />
      }
    >
      <div className="flex flex-col gap-5">
        <p className="text-sm text-content-tertiary">
          {t(`onboarding.verify.sentTo${channel === 'phone' ? 'Phone' : 'Email'}`, { destination })}
        </p>

        <OtpField
          key={attempt}
          autoFocus
          value={otp.code}
          onChange={(digits) => {
            otp.setCode(digits)
            setError(null)
            if (digits.length === otp.length) runVerify(digits)
          }}
          error={error ? { title: error } : null}
          loading={verifying}
          success={verified}
        />

        <p className="text-center text-sm text-content-secondary">
          {t('auth.alreadyHaveAccount')}{' '}
          <Link to="/login" className="font-medium text-content-link hover:text-content-link-hover">
            {t('auth.signIn')}
          </Link>
        </p>
      </div>
    </StepFrame>
  )
}
