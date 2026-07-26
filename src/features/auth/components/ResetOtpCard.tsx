import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { OtpField, useOtp, formatCountdown, otpLengthFor } from '@/shared/ui/OtpField'
import { AuthFormFrame } from './AuthFormFrame'
import type { ResetChannel } from '../useForgotPassword'

/** Mock codes — the SMS code is 4 digits, the email code 6 (matches the backend contract). */
const DEMO_CODE = { sms: '1234', email: '123456' } as const

interface ResetOtpCardProps {
  /** Where the code was sent (email or mobile) — shown in the subtitle. */
  destination: string
  /** Which channel it went to — sizes the code (SMS 4 digits, email 6). */
  channel: ResetChannel
  /** Code verified → go to choose-new-password. */
  onVerified: () => void
  /** Back to the reset-request step. */
  onBack: () => void
}

/** Reset step 2 — verify the code sent to the chosen destination (mock: accepts 123456). */
export function ResetOtpCard({ destination, channel, onVerified, onBack }: ResetOtpCardProps) {
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const length = otpLengthFor(channel)

  const otp = useOtp({
    length,
    onVerify: (code) => {
      if (code !== DEMO_CODE[channel]) {
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
    <AuthFormFrame title={t('auth.otpVerifyTitle')} subtitle={t('auth.otpSubtitle', { destination, length })}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          otp.submit()
        }}
        className="flex flex-col gap-4"
      >
        <OtpField
          label={t('auth.otpLabel')}
          length={length}
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
