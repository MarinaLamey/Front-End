import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { Field } from '@/shared/ui/Field'
import { TracingBorder } from '@/shared/ui/TracingBorder'
import { MailIcon, MessageIcon } from './authIcons'
import { AuthFormFrame } from './AuthFormFrame'
import { useForgotPassword, type ResetChannel } from '../useForgotPassword'

interface ForgotPasswordCardProps {
  /** Code "sent" → go to the OTP step with the destination it went to. */
  onCodeSent: (destination: string) => void
  /** Back to the main sign-in card. */
  onBack: () => void
}

/** Reset step 1 — choose where to send the code and enter the destination. */
export function ForgotPasswordCard({ onCodeSent, onBack }: ForgotPasswordCardProps) {
  const { t } = useTranslation()
  const reset = useForgotPassword({ onCodeSent })

  const channels: { value: ResetChannel; label: string; Icon: typeof MailIcon }[] = [
    { value: 'email', label: t('auth.channelEmail'), Icon: MailIcon },
    { value: 'sms', label: t('auth.channelSms'), Icon: MessageIcon },
  ]

  return (
    <AuthFormFrame title={t('auth.resetTitle')} subtitle={t('auth.resetSubtitle')}>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          reset.send()
        }}
        className="flex flex-col gap-4"
      >
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-content-primary">{t('auth.sendMyCodeBy')}</span>
          <div className="grid grid-cols-2 gap-3">
            {channels.map(({ value, label, Icon }) => {
              const selected = reset.channel === value
              return (
                <button
                  key={value}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => reset.setChannel(value)}
                  className={cn(
                    'inline-flex h-[50px] items-center justify-center gap-2 rounded-2xl p-3 text-base outline outline-1 -outline-offset-1 transition-colors',
                    selected
                      ? 'bg-bg-surface text-content-primary shadow-sm outline-brand-primary'
                      : 'text-content-secondary outline-border-subtle hover:outline-border-focus',
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              )
            })}
          </div>
        </div>

        {reset.channel === 'email' ? (
          <Field
            label={t('auth.email')}
            required
            type="email"
            autoComplete="email"
            placeholder="name@company.com"
            value={reset.email}
            onChange={(event) => reset.setEmail(event.target.value)}
          />
        ) : (
          <Field
            label={t('auth.mobileNumber')}
            required
            inputMode="tel"
            autoComplete="tel"
            leftIcon={<span className="text-xs font-medium text-content-tertiary">+966</span>}
            placeholder={t('auth.mobileHint')}
            value={reset.mobile}
            onChange={(event) => reset.setMobile(event.target.value)}
          />
        )}

        <div className="relative">
          <Button type="submit" size="lg" fullWidth disabled={!reset.canSend || reset.isSending}>
            {t('auth.sendResetCode')}
          </Button>
          {reset.isSending && <TracingBorder radius={8} />}
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
