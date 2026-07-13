import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { TracingBorder } from '@/shared/ui/TracingBorder'
import { useOtpVerify } from '../useOtpVerify'

interface OtpVerifyCardProps {
  orgId: string
  /** The email/mobile the code was sent to — shown in the copy. */
  destination: string
  /** epoch ms when resend first becomes available. */
  resendAvailableAt: number
  onVerified: () => void
  onBack: () => void
}

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Step 2 of registration — email/mobile OTP verification (HLD §5.2). */
export function OtpVerifyCard({ orgId, destination, resendAvailableAt, onVerified, onBack }: OtpVerifyCardProps) {
  const { t } = useTranslation()
  const { code, setCode, isComplete, verify, isVerifying, verifyError, resend, isResending, canResend, secondsLeft } =
    useOtpVerify({ orgId, initialResendAt: resendAvailableAt, onVerified })

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        if (isComplete) verify()
      }}
      className="flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-surface p-7"
    >
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-content-primary">{t('auth.otpVerifyTitle')}</h1>
        <p className="text-sm text-content-secondary">{t('auth.otpSubtitle', { destination })}</p>
      </div>

      <label htmlFor="otp-code" className="text-sm font-medium text-content-primary">
        {t('auth.otpLabel')}
      </label>
      <input
        id="otp-code"
        type="text"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={6}
        value={code}
        onChange={(event) => setCode(event.target.value)}
        aria-invalid={verifyError ? true : undefined}
        className="w-full rounded-lg border border-border-default bg-bg-surface py-3 text-center text-2xl font-bold tracking-[0.5em] text-content-primary outline-none focus:border-border-focus"
      />

      {verifyError && (
        <p role="alert" className="text-sm text-status-danger">
          {verifyError.title}
        </p>
      )}

      <div className="relative">
        <Button type="submit" size="lg" fullWidth disabled={!isComplete || isVerifying}>
          {t('auth.verify')}
        </Button>
        {isVerifying && <TracingBorder radius={8} />}
      </div>

      <div className="flex items-center justify-center gap-1.5 text-sm">
        <span className="text-content-tertiary">{t('auth.didntReceive')}</span>
        {canResend ? (
          <button
            type="button"
            onClick={resend}
            disabled={isResending}
            className="font-medium text-content-link hover:text-content-link-hover disabled:opacity-60"
          >
            {t('auth.resend')}
          </button>
        ) : (
          <span className="text-content-tertiary">
            {t('auth.resendIn', { time: formatCountdown(secondsLeft) })}
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={onBack}
        className="text-center text-sm text-content-secondary hover:text-content-primary"
      >
        {t('auth.back')}
      </button>
    </form>
  )
}
