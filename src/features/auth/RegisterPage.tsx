import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/platform/auth'
import type { OnboardingRole, OtpChallenge } from '@/platform/api'
import { PlayIcon } from './components/authIcons'
import { RegisterFormCard } from './components/RegisterFormCard'
import { OtpVerifyCard } from './components/OtpVerifyCard'
import { OrgProfileWizard } from './components/OrgProfileWizard'

type Step = 'form' | 'otp' | 'profile'

interface PendingRegistration {
  orgId: string
  otp: OtpChallenge
  roles: OnboardingRole[]
  /** The email/mobile the OTP was sent to. */
  destination: string
}

/**
 * Registration shell — the HLD onboarding step machine: org-capture form → OTP
 * verification → Organization Profile wizard → primary role's dashboard.
 */
export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState<Step>('form')
  const [pending, setPending] = useState<PendingRegistration | null>(null)

  const handleRegistered = (result: PendingRegistration) => {
    setPending(result)
    setStep('otp')
  }

  // Profile submitted → account Active → land on the primary role's dashboard.
  const handleSubmitted = () => {
    const primary = pending?.roles[0] ?? 'buyer'
    login(primary)
    navigate(`/${primary}`)
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,var(--color-bg-canvas)_0%,var(--color-bg-surface-sunken)_100%)] px-4 py-10">
      <a
        href="#"
        className="absolute start-12 top-12 hidden items-center gap-2 rounded-lg border border-[#99F6E4] bg-brand-subtle px-4 py-2.5 text-sm font-semibold text-brand-strong md:inline-flex"
      >
        <PlayIcon className="h-3.5 w-3.5" />
        {t('auth.watchDemo')}
      </a>

      {step === 'profile' && pending ? (
        <OrgProfileWizard orgId={pending.orgId} roles={pending.roles} onSubmitted={handleSubmitted} />
      ) : step === 'otp' && pending ? (
        <OtpVerifyCard
          orgId={pending.orgId}
          destination={pending.destination}
          resendAvailableAt={pending.otp.resendAvailableAt}
          onVerified={() => setStep('profile')}
          onBack={() => setStep('form')}
        />
      ) : (
        <RegisterFormCard onRegistered={handleRegistered} />
      )}
    </div>
  )
}
