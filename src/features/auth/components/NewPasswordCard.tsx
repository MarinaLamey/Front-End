import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { TracingBorder } from '@/shared/ui/TracingBorder'
import { EyeIcon, EyeOffIcon } from './authIcons'
import { AuthFormFrame } from './AuthFormFrame'
import { useNewPassword } from '../useNewPassword'

interface NewPasswordCardProps {
  /** Saved → go to the success screen. */
  onSaved: () => void
  /** Back to the main sign-in card. */
  onBack: () => void
}

/** Reset step 3 — choose a new password (with confirmation). */
export function NewPasswordCard({ onSaved, onBack }: NewPasswordCardProps) {
  const { t } = useTranslation()
  const form = useNewPassword({ onSaved })

  return (
    <AuthFormFrame title={t('auth.newPasswordTitle')} subtitle={t('auth.newPasswordSubtitle')}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          form.save()
        }}
        className="flex flex-col gap-4"
      >
        <Field
          label={t('auth.newPasswordLabel')}
          required
          type={form.showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          helperText={t('auth.passwordRule')}
          value={form.password}
          onChange={(event) => form.setPassword(event.target.value)}
          error={
            form.password.length > 0 && !form.strongEnough ? { title: t('validation.passwordMin8') } : null
          }
          trailingAction={{
            icon: form.showPassword ? (
              <EyeOffIcon className="h-[18px] w-[18px]" />
            ) : (
              <EyeIcon className="h-[18px] w-[18px]" />
            ),
            label: t('auth.togglePassword'),
            onClick: form.toggleShowPassword,
            pressed: form.showPassword,
          }}
        />

        <Field
          label={t('auth.confirmPassword')}
          required
          type={form.showConfirm ? 'text' : 'password'}
          autoComplete="new-password"
          placeholder="••••••••"
          value={form.confirm}
          onChange={(event) => form.setConfirm(event.target.value)}
          error={
            form.confirm.length > 0 && !form.passwordsMatch
              ? { title: t('validation.passwordMismatch') }
              : null
          }
          trailingAction={{
            icon: form.showConfirm ? (
              <EyeOffIcon className="h-[18px] w-[18px]" />
            ) : (
              <EyeIcon className="h-[18px] w-[18px]" />
            ),
            label: t('auth.togglePassword'),
            onClick: form.toggleShowConfirm,
            pressed: form.showConfirm,
          }}
        />

        <div className="relative">
          <Button type="submit" size="lg" fullWidth disabled={!form.canSave || form.isSaving}>
            {t('auth.saveNewPassword')}
          </Button>
          {form.isSaving && <TracingBorder radius={8} />}
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
