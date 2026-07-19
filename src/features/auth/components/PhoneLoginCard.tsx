import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { cleanMobile, isSaudiMobile } from '@/shared/lib/validators'
import { OtpField, formatCountdown } from '@/shared/ui/OtpField'
import { TracingBorder } from '@/shared/ui/TracingBorder'
import type { LoginResult } from '@/platform/api'
import { AuthFormFrame } from './AuthFormFrame'
import { usePhoneLogin } from '../usePhoneLogin'

interface PhoneLoginCardProps {
  onAuthenticated: (result: LoginResult) => void
  /** Back to the main sign-in card ("Use email instead"). */
  onBack: () => void
}

/** Passwordless phone login — enter a mobile number, then the texted OTP. */
export function PhoneLoginCard({ onAuthenticated, onBack }: PhoneLoginCardProps) {
  const { t } = useTranslation()
  const phone = usePhoneLogin({ onAuthenticated })

  if (phone.phase === 'code') {
    return (
      <AuthFormFrame
        title={t('auth.verifyPhoneTitle')}
        subtitle={t('auth.otpSubtitle', { destination: phone.mobile })}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (phone.isComplete) phone.verify()
          }}
          className="flex flex-col gap-4"
        >
          <OtpField
            label={t('auth.otpLabel')}
            autoFocus
            value={phone.code}
            onChange={phone.setCode}
            error={phone.verifyError}
          />

          <div className="relative">
            <Button type="submit" size="lg" fullWidth disabled={!phone.isComplete || phone.isVerifying}>
              {t('auth.verify')}
            </Button>
            {phone.isVerifying && <TracingBorder radius={8} />}
          </div>

          <div className="flex items-center justify-center gap-1.5 text-sm">
            <span className="text-content-tertiary">{t('auth.didntReceive')}</span>
            {phone.canResend ? (
              <button
                type="button"
                onClick={phone.resend}
                disabled={phone.isResending}
                className="font-medium text-content-link hover:text-content-link-hover disabled:opacity-60"
              >
                {t('auth.resend')}
              </button>
            ) : (
              <span className="text-content-tertiary">
                {t('auth.resendIn', { time: formatCountdown(phone.secondsLeft) })}
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={phone.toNumber}
            className="text-center text-sm text-content-secondary hover:text-content-primary"
          >
            {t('auth.back')}
          </button>
        </form>
      </AuthFormFrame>
    )
  }

  // Same Saudi-mobile rule as register: digits only, +966/leading-0 stripped, 9 digits from 5.
  const mobileValid = isSaudiMobile(phone.mobile)
  const mobileError =
    phone.mobile.length > 0 && !mobileValid ? { title: t('validation.mobileInvalid') } : phone.requestError

  return (
    <AuthFormFrame title={t('auth.phoneScreenTitle')} subtitle={t('auth.phoneScreenSubtitle')}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (mobileValid) phone.requestOtp()
        }}
        className="flex flex-col gap-4"
      >
        <Field
          label={t('auth.mobileNumber')}
          required
          inputMode="tel"
          autoComplete="tel"
          autoFocus
          leftIcon={<span className="text-xs font-medium text-content-tertiary">+966</span>}
          placeholder={t('auth.mobileHint')}
          value={phone.mobile}
          onChange={(event) => phone.setMobile(cleanMobile(event.target.value))}
          error={mobileError}
          success={mobileValid}
        />

        <div className="relative">
          <Button type="submit" size="lg" fullWidth disabled={!mobileValid || phone.isRequesting}>
            {t('auth.sendCode')}
          </Button>
          {phone.isRequesting && <TracingBorder radius={8} />}
        </div>

        <button
          type="button"
          onClick={onBack}
          className="text-center text-sm font-medium text-content-link hover:text-content-link-hover"
        >
          {t('auth.useEmailInstead')}
        </button>
      </form>
    </AuthFormFrame>
  )
}
