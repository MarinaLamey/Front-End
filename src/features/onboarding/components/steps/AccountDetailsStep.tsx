import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/platform/api'
import { Field } from '@/shared/ui/Field'
import { EyeIcon, EyeOffIcon } from '@/features/auth/components/authIcons'
import { StepFrame } from '../StepFrame'
import { WizardFooter } from '../WizardFooter'
import type { OnboardingData } from '../../useOnboardingWizard'

interface AccountDetailsStepProps {
  data: OnboardingData
  patch: (partial: Partial<OnboardingData>) => void
  onNext: () => void
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^(?:\+9665\d{8}|05\d{8}|5\d{8})$/

/** Step 1 — the login details. Role now lives on the Company details step. */
export function AccountDetailsStep({ data, patch, onNext }: AccountDetailsStepProps) {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  // Server-side uniqueness, checked once when the step is completed — not per keystroke.
  const [taken, setTaken] = useState<{ email?: boolean; mobile?: boolean }>({})
  const availability = useMutation({ mutationFn: api.checkAvailability })

  const passwordsMatch = data.password.length > 0 && data.password === data.confirmPassword
  const canContinue =
    data.fullName.trim().length > 0 &&
    EMAIL_RE.test(data.email) &&
    MOBILE_RE.test(data.mobile.replace(/\s/g, '')) &&
    data.password.length >= 8 &&
    passwordsMatch &&
    data.terms

  // Editing an identifier clears its stale "already registered" flag.
  const setEmail = (email: string) => {
    patch({ email })
    if (taken.email) setTaken((prev) => ({ ...prev, email: false }))
  }
  const setMobile = (mobile: string) => {
    patch({ mobile })
    if (taken.mobile) setTaken((prev) => ({ ...prev, mobile: false }))
  }

  // Gate the step: confirm the email/mobile aren't already registered before advancing.
  const handleContinue = async () => {
    try {
      const result = await availability.mutateAsync({ email: data.email, mobile: data.mobile })
      const emailTaken = result.email === 'taken'
      const mobileTaken = result.mobile === 'taken'
      setTaken({ email: emailTaken, mobile: mobileTaken })
      if (!emailTaken && !mobileTaken) onNext()
    } catch {
      // Availability check unreachable — don't trap the user; final submit still guards.
      onNext()
    }
  }

  const emailError =
    data.email.length > 0 && !EMAIL_RE.test(data.email)
      ? { title: t('validation.emailInvalid') }
      : taken.email
        ? { title: t('validation.emailTaken') }
        : null
  const mobileError =
    data.mobile.length > 0 && !MOBILE_RE.test(data.mobile.replace(/\s/g, ''))
      ? { title: t('validation.mobileInvalid') }
      : taken.mobile
        ? { title: t('validation.mobileTaken') }
        : null

  return (
    <StepFrame
      title={t('onboarding.account.createTitle')}
      subtitle={t('onboarding.account.createSubtitle')}
      footer={
        <WizardFooter
          continueLabel={t('onboarding.continue')}
          onContinue={handleContinue}
          disabled={!canContinue}
          loading={availability.isPending}
        />
      }
    >
      <div className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-content-primary">{t('onboarding.account.details')}</h2>

        <Field
          label={t('onboarding.account.fullName')}
          required
          autoComplete="name"
          placeholder={t('onboarding.account.fullNamePlaceholder')}
          value={data.fullName}
          onChange={(event) => patch({ fullName: event.target.value })}
        />

        <Field
          label={t('onboarding.account.email')}
          required
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          value={data.email}
          onChange={(event) => setEmail(event.target.value)}
          error={emailError}
        />

        <Field
          label={t('onboarding.account.mobile')}
          required
          inputMode="tel"
          autoComplete="tel"
          leftIcon={<span className="text-xs font-medium text-content-tertiary">+966</span>}
          placeholder={t('auth.mobileHint')}
          value={data.mobile}
          onChange={(event) => setMobile(event.target.value)}
          error={mobileError}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Field
            label={t('auth.password')}
            required
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={data.password}
            onChange={(event) => patch({ password: event.target.value })}
            error={data.password.length > 0 && data.password.length < 8 ? { title: t('validation.passwordMin8') } : null}
            trailingAction={{
              icon: showPassword ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />,
              label: t('auth.togglePassword'),
              onClick: () => setShowPassword((prev) => !prev),
              pressed: showPassword,
            }}
          />
          <Field
            label={t('onboarding.account.confirmPassword')}
            required
            type={showConfirm ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="••••••••"
            value={data.confirmPassword}
            onChange={(event) => patch({ confirmPassword: event.target.value })}
            error={
              data.confirmPassword.length > 0 && !passwordsMatch ? { title: t('validation.passwordMismatch') } : null
            }
            trailingAction={{
              icon: showConfirm ? <EyeOffIcon className="h-[18px] w-[18px]" /> : <EyeIcon className="h-[18px] w-[18px]" />,
              label: t('auth.togglePassword'),
              onClick: () => setShowConfirm((prev) => !prev),
              pressed: showConfirm,
            }}
          />
        </div>
        <p className="text-xs text-content-tertiary">{t('onboarding.account.passwordHint')}</p>

        <label className="flex items-start gap-2.5 text-sm text-content-secondary">
          <input
            type="checkbox"
            checked={data.terms}
            onChange={(event) => patch({ terms: event.target.checked })}
            className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded border-border-default accent-brand-primary"
          />
          {t('auth.agreeTerms')}
        </label>
      </div>
    </StepFrame>
  )
}
