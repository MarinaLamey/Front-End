import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { TracingBorder } from '@/shared/ui/TracingBorder'
import { BrandLogo } from '@/shared/ui/BrandLogo'
import { fieldError } from '@/shared/lib/formError'
import { useTenant } from '@/platform/tenancy'
import type { OnboardingRole, OtpChallenge } from '@/platform/api'
import { BuildingIcon, BuyerIcon, LockIcon, MailIcon, SupplierIcon } from './authIcons'
import { useRegisterForm, type RegisterRole } from '../useRegisterForm'

const ROLES: { id: RegisterRole; Icon: typeof BuyerIcon; labelKey: string; taglineKey: string }[] = [
  { id: 'buyer', Icon: BuyerIcon, labelKey: 'portals.buyer', taglineKey: 'auth.buyerTagline' },
  { id: 'supplier', Icon: SupplierIcon, labelKey: 'portals.supplier', taglineKey: 'auth.supplierTagline' },
  { id: 'both', Icon: BuildingIcon, labelKey: 'auth.roleBoth', taglineKey: 'auth.bothTagline' },
]

interface RegisterFormCardProps {
  /** Org created + OTP issued → the page advances to verification. */
  onRegistered: (result: {
    orgId: string
    otp: OtpChallenge
    roles: OnboardingRole[]
    destination: string
  }) => void
}

/** Step 1 of registration — the HLD org-level capture form. */
export function RegisterFormCard({ onRegistered }: RegisterFormCardProps) {
  const { t } = useTranslation()
  const { tenant } = useTenant()
  const {
    register,
    handleSubmit,
    errors,
    isValid,
    role,
    selectRole,
    tracedRole,
    otpChannel,
    setOtpChannel,
    onSubmit,
    isSubmitting,
    submitError,
  } = useRegisterForm({ onRegistered })

  const OTP_CHANNELS = ['email', 'mobile'] as const

  return (
    <div className="flex w-full max-w-[480px] flex-col gap-4 rounded-[20px] border border-border-subtle bg-bg-surface px-12 py-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-1px_rgba(0,0,0,0.06)]">
      <div className="flex flex-col items-center gap-2 text-center">
        <div
          style={{
            padding: '9px 12px',
            background: 'white',
            boxShadow: '0px 2px 8px rgba(15, 23, 41, 0.14)',
            overflow: 'hidden',
            borderRadius: 12,
            display: 'inline-flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <BrandLogo className="w-[60px] h-[40px] rounded-[2px]" />
        </div>
        <h1 className="text-2xl font-semibold text-content-primary">{t('auth.createAccount')}</h1>
        <p className="text-base text-content-secondary">
          {t('auth.joinSubtitle', { tenant: tenant.name })}
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
        <div className="flex flex-col gap-2">
          <span className="text-xs font-medium uppercase tracking-wide text-content-secondary">
            {t('auth.signingUpAs')}
          </span>
          <div className="flex gap-3">
            {ROLES.map(({ id, Icon, labelKey, taglineKey }) => {
              const selected = role === id
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => selectRole(id)}
                  className={cn(
                    'relative flex flex-1 flex-col items-start gap-1.5 rounded-xl p-3.5 text-start outline transition-colors',
                    selected
                      ? 'bg-brand-subtle outline-[1.5px] -outline-offset-[1.5px] outline-brand-primary'
                      : 'bg-bg-surface outline-1 -outline-offset-1 outline-border-default hover:outline-border-focus',
                  )}
                >
                  <Icon
                    className={cn('h-[22px] w-[22px]', selected ? 'text-brand-strong' : 'text-content-tertiary')}
                  />
                  <span
                    className={cn('text-sm font-medium', selected ? 'text-brand-strong' : 'text-content-primary')}
                  >
                    {t(labelKey)}
                  </span>
                  <span className="text-xs text-content-tertiary">{t(taglineKey)}</span>
                  {tracedRole === id && <TracingBorder radius={12} />}
                </button>
              )
            })}
          </div>
        </div>

        <Field
          size="lg"
          label={t('auth.organizationName')}
          leftIcon={<BuildingIcon className="h-[18px] w-[18px]" />}
          placeholder={t('auth.businessNamePlaceholder')}
          error={fieldError(errors.organizationName)}
          {...register('organizationName')}
        />
        <Field
          size="lg"
          label={t('auth.crLabel')}
          inputMode="numeric"
          placeholder={t('auth.crPlaceholder')}
          error={fieldError(errors.cr)}
          {...register('cr')}
        />
        <Field
          size="lg"
          label={t('auth.mobile')}
          inputMode="tel"
          autoComplete="tel"
          placeholder={t('auth.mobilePlaceholder')}
          error={fieldError(errors.mobile)}
          {...register('mobile')}
        />
        <Field
          size="lg"
          label={t('auth.workEmail')}
          type="email"
          autoComplete="email"
          leftIcon={<MailIcon className="h-[18px] w-[18px]" />}
          placeholder="name@company.com"
          error={fieldError(errors.email)}
          {...register('email')}
        />

        {/* HLD §5.2 — verify via email OR mobile. The choice sets the OTP destination. */}
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-content-primary">{t('auth.otpChannelLabel')}</span>
          <div className="flex gap-2">
            {OTP_CHANNELS.map((channel) => {
              const selected = otpChannel === channel
              return (
                <button
                  key={channel}
                  type="button"
                  onClick={() => setOtpChannel(channel)}
                  aria-pressed={selected}
                  className={cn(
                    'flex-1 rounded-lg border px-4 py-2.5 text-sm font-medium transition-colors',
                    selected
                      ? 'border-brand-primary bg-brand-subtle text-brand-strong'
                      : 'border-border-default text-content-secondary hover:border-border-focus',
                  )}
                >
                  {t(`auth.${channel}`)}
                </button>
              )
            })}
          </div>
        </div>

        <Field
          size="lg"
          label={t('auth.password')}
          type="password"
          autoComplete="new-password"
          leftIcon={<LockIcon className="h-[18px] w-[18px]" />}
          placeholder={t('auth.createPassword')}
          error={fieldError(errors.password)}
          {...register('password')}
        />
        <Field
          size="lg"
          label={t('auth.confirmPassword')}
          type="password"
          autoComplete="new-password"
          leftIcon={<LockIcon className="h-[18px] w-[18px]" />}
          placeholder={t('auth.confirmPassword')}
          error={fieldError(errors.confirmPassword)}
          {...register('confirmPassword')}
        />

        <label className="flex items-start gap-2.5 text-sm text-content-secondary">
          <input
            type="checkbox"
            className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded accent-brand-primary"
            {...register('terms')}
          />
          {t('auth.agreeTerms')}
        </label>
        {errors.terms && <p className="text-sm text-status-danger">{errors.terms.message}</p>}

        {submitError && (
          <p role="alert" className="text-sm text-status-danger">
            {submitError.title}
          </p>
        )}

        <div className="relative">
          <Button type="submit" size="lg" fullWidth disabled={isSubmitting || !isValid}>
            {t('auth.submitRegister')}
          </Button>
          {isSubmitting && <TracingBorder radius={8} />}
        </div>
      </form>

      <div className="flex items-center justify-center gap-1.5 pt-0.5 text-sm">
        <span className="text-content-secondary">{t('auth.alreadyHaveAccount')}</span>
        <Link to="/login" className="font-medium text-content-link hover:text-content-link-hover">
          {t('auth.signIn')}
        </Link>
      </div>
    </div>
  )
}
