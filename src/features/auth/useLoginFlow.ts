import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/platform/auth'
import type { LoginResult } from '@/platform/api'
import type { ResetChannel } from './useForgotPassword'

export type LoginStep = 'credentials' | 'phone' | 'forgot' | 'resetOtp' | 'newPassword' | 'passwordUpdated'

/** The seeded super-admin account (mock DB). Logging in with it opens the back-office console. */
const SUPERADMIN_ORG_ID = 'org_superadmin'

/** The login flow's state + transitions, with no markup. */
export interface UseLoginFlowResult {
  step: LoginStep
  /** Where the reset code was sent — shown on the OTP screen. */
  resetDestination: string
  /** Which channel it went to — sizes the OTP field (SMS 4 digits, email 6). */
  resetChannel: ResetChannel
  /** Identity verified → log in and land on the dashboard. */
  onAuthenticated: (result: LoginResult) => void
  /** Switch to the passwordless phone-OTP sign-in. */
  startPhone: () => void
  /** Back to the credentials card from any sub-flow. */
  backToCredentials: () => void
  /** Begin the reset-password flow. */
  startForgot: () => void
  /** Reset code sent → verify it, remembering the destination + channel. */
  resetCodeSent: (destination: string, channel: ResetChannel) => void
  /** Reset code verified → choose a new password. */
  resetOtpVerified: () => void
  /** Back from the OTP screen to the reset-request screen. */
  backToForgot: () => void
  /** New password saved → show the success screen. */
  passwordSaved: () => void
}

/**
 * useLoginFlow — the login state machine, with no markup.
 *
 * Verify identity (password / Google / Apple / phone-OTP) → log in and land on the
 * dashboard. A parallel reset-password branch runs request → OTP → new password → done.
 * Per HLD v1.0 there is no per-role PIN and no "Continue as" step.
 */
export function useLoginFlow(): UseLoginFlowResult {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState<LoginStep>('credentials')
  const [resetDestination, setResetDestination] = useState('')
  const [resetChannel, setResetChannel] = useState<ResetChannel>('email')

  const onAuthenticated = (result: LoginResult) => {
    // The system super-admin (back-office) → the admin console, not a tenant portal. It has no
    // buyer/supplier role, so it's identified by account, and login('back-office') grants SuperAdmin.
    if (result.orgId === SUPERADMIN_ORG_ID) {
      login('back-office', { name: 'System Admin' })
      navigate('/admin/verifications')
      return
    }
    const portal = result.roles[0]
    login(portal)
    navigate(`/${portal}`)
  }

  return {
    step,
    resetDestination,
    resetChannel,
    onAuthenticated,
    startPhone: () => setStep('phone'),
    backToCredentials: () => setStep('credentials'),
    startForgot: () => setStep('forgot'),
    resetCodeSent: (destination, channel) => {
      setResetDestination(destination)
      setResetChannel(channel)
      setStep('resetOtp')
    },
    resetOtpVerified: () => setStep('newPassword'),
    backToForgot: () => setStep('forgot'),
    passwordSaved: () => setStep('passwordUpdated'),
  }
}
