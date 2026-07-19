import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { OtpField, useOtp } from '@/shared/ui/OtpField'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import { CheckIcon, LockIcon } from '../registerIcons'
import type { OnboardingData } from '../../useOnboardingWizard'

type Channel = 'phone' | 'email'

interface VerifyStepProps {
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
  onNext: () => void
  onBack: () => void
}

const CHANNELS: { id: Channel; labelKey: string }[] = [
  { id: 'phone', labelKey: 'onboarding.verify.phoneTab' },
  { id: 'email', labelKey: 'onboarding.verify.emailTab' },
]

const DEMO_CODE = '1234'

/** Pause after a correct phone code so its green success reads before the email tab takes over. */
const HANDOVER_MS = 700

/** Mask a mobile to `+966 •••• 5678` for the "we sent a code to …" line. */
function maskMobile(mobile: string): string {
  const last4 = mobile.replace(/\D/g, '').slice(-4)
  return `+966 •••• ${last4 || 'xxxx'}`
}

/**
 * VerifyStep — step 2. Both channels live here: a Phone / Email pill switch over one 4-digit
 * segmented OTP that VERIFIES AUTOMATICALLY once the last cell is filled — there is no Verify
 * button. Email stays locked until the phone is confirmed, so the step is sequential; a correct
 * phone code hands over to email on its own. A wrong code clears all four cells and refocuses
 * the first (via the remount `key`). Continue unlocks only once BOTH channels are verified.
 */
export function VerifyStep({ data, patch, onNext, onBack }: VerifyStepProps) {
  const { t } = useTranslation()
  const [channel, setChannel] = useState<Channel>('phone')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Bumped on a wrong code / channel switch → remounts OtpField, clearing the boxes and
  // refocusing the first.
  const [attempt, setAttempt] = useState(0)
  const otp = useOtp()

  const verified = channel === 'phone' ? data.phoneVerified : data.emailVerified
  const destination = channel === 'phone' ? maskMobile(data.mobile) : data.email || 'your email'

  // Switch channel with a clean slate — a half-typed code must not follow the user across.
  const switchTo = (next: Channel) => {
    setChannel(next)
    setError(null)
    otp.setCode('')
    setAttempt((n) => n + 1)
  }

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
      if (channel === 'phone' && !data.emailVerified) {
        window.setTimeout(() => switchTo('email'), HANDOVER_MS)
      }
    }, 1100)
  }

  return (
    <StepFrame
      title={t('onboarding.verify.title')}
      subtitle={t('onboarding.verify.subtitle')}
      footer={
        <WizardFooter
          onBack={onBack}
          continueLabel={t('onboarding.continue')}
          onContinue={onNext}
          disabled={!data.phoneVerified || !data.emailVerified}
        />
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex gap-2">
          {CHANNELS.map(({ id, labelKey }) => {
            const done = id === 'phone' ? data.phoneVerified : data.emailVerified
            const active = id === channel
            // Email opens only once the phone is confirmed.
            const locked = id === 'email' && !data.phoneVerified

            return (
              <button
                key={id}
                type="button"
                disabled={locked || verifying}
                aria-current={active ? 'step' : undefined}
                onClick={() => !active && switchTo(id)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium',
                  'transition-colors motion-reduce:transition-none',
                  active
                    ? 'bg-brand-primary text-brand-primary-on'
                    : cn(
                        'bg-bg-surface-sunken',
                        locked ? 'cursor-not-allowed text-content-tertiary' : 'text-content-secondary',
                        done && 'text-brand-primary',
                      ),
                )}
              >
                {done ? (
                  <CheckIcon className="h-3.5 w-3.5" />
                ) : locked ? (
                  <LockIcon className="h-3.5 w-3.5" />
                ) : null}
                {t(labelKey)}
              </button>
            )
          })}
        </div>

        <p className="text-sm text-content-tertiary">
          {t(`onboarding.verify.sentTo${channel === 'phone' ? 'Phone' : 'Email'}`, { destination })}
        </p>

        <OtpField
          key={`${channel}-${attempt}`}
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
      </div>
    </StepFrame>
  )
}
