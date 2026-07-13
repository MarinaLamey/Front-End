import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { AuthFormFrame } from './AuthFormFrame'

/** Success check in a soft brand-tinted circle. */
function SuccessCheck() {
  return (
    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-brand-subtle text-brand-primary">
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="h-7 w-7"
      >
        <path d="M20 6 9 17l-5-5" />
      </svg>
    </span>
  )
}

interface PasswordUpdatedCardProps {
  /** Back to the main sign-in card. */
  onBack: () => void
}

/** Reset step 4 — confirmation that the password was changed. */
export function PasswordUpdatedCard({ onBack }: PasswordUpdatedCardProps) {
  const { t } = useTranslation()

  return (
    <AuthFormFrame
      centered
      media={<SuccessCheck />}
      title={t('auth.passwordUpdatedTitle')}
      subtitle={t('auth.passwordUpdatedSubtitle')}
    >
      <Button size="lg" fullWidth onClick={onBack}>
        {t('auth.backToSignIn')}
      </Button>
    </AuthFormFrame>
  )
}
