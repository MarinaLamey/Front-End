import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { OtpField, useOtp, formatCountdown } from '@/shared/ui/OtpField'
import { AuthFormFrame } from './AuthFormFrame'

const DEMO_CODE = '1234'

interface ResetOtpCardProps {
  /** Where the code was sent (email or mobile) — shown in the subtitle. */
  destination: string
  /** Code verified → go to choose-new-password. */
  onVerified: () => void
  /** Back to the reset-request step. */
  onBack: () => void
}

/** Reset step 2 — verify the code sent to the chosen destination (mock: accepts 123456). */
export function ResetOtpCard({ destination, onVerified, onBack }: ResetOtpCardProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)

  const otp = useOtp({
    onVerify: (code) => {
      if (code !== DEMO_CODE) {
        setError(t('onboarding.verify.invalid'))
        return
      }
      onVerified()
    },
  })

  // The code was already sent by the request screen — start the resend cooldown on mount.
  useEffect(() => {
    otp.startCountdown()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const resend = () => {
    otp.clear()
    otp.startCountdown()
  }

  return (
    <AuthFormFrame title={t('auth.otpVerifyTitle')} subtitle={t('auth.otpSubtitle', { destination })}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          otp.submit()
        }}
        className="flex flex-col gap-4"
      >
        <OtpField
          label={t('auth.otpLabel')}
          autoFocus
          value={otp.code}
          onChange={(digits) => {
            otp.setCode(digits)
            setError(null)
          }}
          error={error ? { title: error } : null}
        />

        <Button type="submit" size="lg" fullWidth disabled={!otp.isComplete}>
          {t('auth.verify')}
        </Button>

        <div className="flex items-center justify-center gap-1.5 text-sm">
          <span className="text-content-tertiary">{t('auth.didntReceive')}</span>
          {otp.canResend ? (
            <button
              type="button"
              onClick={resend}
              className="font-medium text-content-link hover:text-content-link-hover"
            >
              {t('auth.resend')}
            </button>
          ) : (
            <span className="text-content-tertiary">
              {t('auth.resendIn', { time: formatCountdown(otp.secondsLeft) })}
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-center text-sm font-medium text-content-link hover:text-content-link-hover"
        >
          {t('auth.backToSignIn')}
        </button>
      </form>
    </AuthFormFrame>
  )
}
