import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { OtpField, useOtp } from '@/shared/ui/OtpField'
import { TracingBorder } from '@/shared/ui/TracingBorder'
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
 * VerifyStep — steps 2 & 3. One component parameterised by channel (phone → email): a
 * 4-digit segmented OTP with a synchronized tracing-border loader across all cells and the
 * Verify button (they share the `.mp-trace` timeline). Mock: the code is 1234. Continue
 * unlocks once this channel is verified.
 */
export function VerifyStep({ channel, data, patch, onNext, onBack }: VerifyStepProps) {
  const { t } = useTranslation()
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const otp = useOtp()

  const verified = channel === 'phone' ? data.phoneVerified : data.emailVerified
  const destination = channel === 'phone' ? maskMobile(data.mobile) : data.email || 'your email'

  const runVerify = () => {
    if (!otp.isComplete || verifying) return
    setVerifying(true)
    setError(null)
    // Mock verification — a short delay drives the synchronized loader, then 1234 passes.
    window.setTimeout(() => {
      setVerifying(false)
      if (otp.code !== DEMO_CODE) {
        setError(t('onboarding.verify.invalid'))
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
          autoFocus
          value={otp.code}
          onChange={(digits) => {
            otp.setCode(digits)
            setError(null)
          }}
          error={error ? { title: error } : null}
          loading={verifying}
        />

        <div className="relative">
          <Button size="lg" fullWidth onClick={runVerify} disabled={!otp.isComplete || verifying || verified}>
            {t(`onboarding.verify.verify${channel === 'phone' ? 'Phone' : 'Email'}`)}
          </Button>
          {verifying && <TracingBorder radius={8} />}
        </div>

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
