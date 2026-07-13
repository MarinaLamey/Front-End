import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { TracingBorder } from '@/shared/ui/TracingBorder'
import { fieldError } from '@/shared/lib/formError'
import { useTenant } from '@/platform/tenancy'
import type { LoginResult } from '@/platform/api'
import { AppleIcon, EyeIcon, EyeOffIcon, GoogleIcon, PhoneIcon, PlayIcon } from './authIcons'
import { AuthFormFrame } from './AuthFormFrame'
import { useCredentialsCard } from '../useCredentialsCard'

// Icon-only social / phone sign-in button (bordered surface, no label). Lifts on hover and
// dips on press — a small tactile micro-interaction (transform → GPU; gated for reduced motion).
const socialIconButton =
  'inline-flex h-12 w-16 items-center justify-center rounded-xl border border-border-default ' +
  'bg-bg-surface transition duration-200 hover:bg-interactive-hover hover:-translate-y-0.5 hover:shadow-md ' +
  'active:translate-y-0 active:scale-95 motion-reduce:transition-none motion-reduce:hover:translate-y-0'

interface CredentialsCardProps {
  /** Called with the login result once identity is verified. The flow takes it from here. */
  onAuthenticated: (result: LoginResult) => void
  /** Switch to the passwordless phone-OTP sign-in screen. */
  onPhoneLogin: () => void
  /** Start the reset-password flow. */
  onForgot: () => void
}

/** Sign-in card — verifies identity; role selection happens later in the flow. */
export function CredentialsCard({ onAuthenticated, onPhoneLogin, onForgot }: CredentialsCardProps) {
  const { t } = useTranslation()
  const { tenant } = useTenant()
  const {
    register,
    handleSubmit,
    errors,
    showPassword,
    toggleShowPassword,
    isSubmitting,
    canSubmit,
    emailValid,
    passwordValid,
    submitError,
    onSubmit,
    googleSignIn,
    socialSignIn,
  } = useCredentialsCard({ onAuthenticated })

  return (
    <AuthFormFrame  title={t('auth.signIn')} subtitle={t('auth.signInSubtitle', { tenant: tenant.name })}>
      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col  gap-4" noValidate>
        <Field
          label={t('auth.email')}
          required
          type="email"
          autoComplete="email"
          placeholder="name@company.com"
          error={fieldError(errors.email)}
          success={emailValid}
          {...register('email')}
        />
        <Field
          label={t('auth.password')}
          required
          type={showPassword ? 'text' : 'password'}
          autoComplete="current-password"
          placeholder="••••••••"
          error={fieldError(errors.password)}
          success={passwordValid}
          trailingAction={{
            icon: showPassword ? (
              <EyeOffIcon className="h-[18px] w-[18px]" />
            ) : (
              <EyeIcon className="h-[18px] w-[18px]" />
            ),
            label: t('auth.togglePassword'),
            onClick: toggleShowPassword,
            pressed: showPassword,
          }}
          {...register('password')}
        />

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-content-secondary">
            <input
              type="checkbox"
              className="h-[18px] w-[18px] rounded border-border-default accent-brand-primary"
              {...register('rememberMe')}
            />
            {t('auth.keepSignedIn')}
          </label>
          <button
            type="button"
            onClick={onForgot}
            className="text-sm font-medium text-content-link hover:text-content-link-hover"
          >
            {t('auth.forgotPassword')}
          </button>
        </div>

        {submitError && (
          <p role="alert" className="text-sm text-status-danger">
            {submitError.title}
          </p>
        )}

        <div className="relative">
          <Button type="submit" size="lg" fullWidth disabled={isSubmitting || !canSubmit}>
            {t('auth.signIn')}
          </Button>
          {isSubmitting && <TracingBorder radius={8} />}
        </div>
      </form>

      <div className="mt-4 flex items-center gap-3">
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-xs text-content-tertiary">{t('auth.orContinueWith')}</span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>

      <div className="mt-4 flex items-center justify-center gap-3">
        <button type="button" onClick={googleSignIn} aria-label={t('auth.continueWithGoogle')} className={socialIconButton}>
          <GoogleIcon className="h-5 w-5" />
        </button>
        <button type="button" onClick={socialSignIn} aria-label={t('auth.continueWithApple')} className={socialIconButton}>
          <AppleIcon className="h-5 w-5 text-content-primary" />
        </button>
        <button type="button" onClick={onPhoneLogin} aria-label={t('auth.signInWithPhone')} className={socialIconButton}>
          <PhoneIcon className="h-5 w-5 text-content-primary" />
        </button>
      </div>

      <div className="mt-5 flex flex-col items-center gap-1.5 text-sm">
        <p className="text-content-tertiary">
          {t('auth.dontHaveAccount')}{' '}
          <Link to="/register" className="font-medium text-content-link hover:text-content-link-hover">
            {t('auth.registerNow')}
          </Link>
        </p>
        <p className="inline-flex items-center gap-1.5 text-content-tertiary">
          {t('auth.newToMiProc')}
          <Link to="/" className="inline-flex items-center gap-1 font-medium text-content-link hover:text-content-link-hover">
            <PlayIcon className="h-3.5 w-3.5" />
            {t('auth.watchTour')}
          </Link>
        </p>
      </div>
    </AuthFormFrame>
  )
}
