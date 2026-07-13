import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/platform/auth'
import type { LoginResult } from '@/platform/api'

export type LoginStep = 'credentials' | 'phone' | 'forgot' | 'resetOtp' | 'newPassword' | 'passwordUpdated'

/** The login flow's state + transitions, with no markup. */
export interface UseLoginFlowResult {
  step: LoginStep
  /** Where the reset code was sent — shown on the OTP screen. */
  resetDestination: string
  /** Identity verified → log in and land on the dashboard. */
  onAuthenticated: (result: LoginResult) => void
  /** Switch to the passwordless phone-OTP sign-in. */
  startPhone: () => void
  /** Back to the credentials card from any sub-flow. */
  backToCredentials: () => void
  /** Begin the reset-password flow. */
  startForgot: () => void
  /** Reset code sent → verify it, remembering the destination. */
  resetCodeSent: (destination: string) => void
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

  const onAuthenticated = (result: LoginResult) => {
    const portal = result.roles[0]
    login(portal)
    navigate(`/${portal}`)
  }

  return {
    step,
    resetDestination,
    onAuthenticated,
    startPhone: () => setStep('phone'),
    backToCredentials: () => setStep('credentials'),
    startForgot: () => setStep('forgot'),
    resetCodeSent: (destination) => {
      setResetDestination(destination)
      setStep('resetOtp')
    },
    resetOtpVerified: () => setStep('newPassword'),
    backToForgot: () => setStep('forgot'),
    passwordSaved: () => setStep('passwordUpdated'),
  }
}
