import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth, type Portal } from '@/platform/auth'
import type { LoginResult } from '@/platform/api'

export type LoginStep =
  | 'credentials'
  | 'phone'
  | 'continueAs'
  | 'forgot'
  | 'resetOtp'
  | 'newPassword'
  | 'passwordUpdated'

/** The login flow's state + transitions, with no markup. */
export interface UseLoginFlowResult {
  step: LoginStep
  /** Where the reset code was sent — shown on the OTP screen. */
  resetDestination: string
  /** Identity verified → route by role count (dual-role shows "Continue as"). */
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
  /** A dashboard context was chosen → log it in and land on that portal. */
  selectContext: (role: Portal) => void
}

/**
 * useLoginFlow — the login state machine, with no markup.
 *
 * verify identity → if the org has >1 role, choose a dashboard CONTEXT ("Continue as");
 * otherwise go straight to its dashboard. A parallel reset-password branch runs
 * request → OTP → new password → done. Per HLD v1.0 there is no per-role PIN.
 */
export function useLoginFlow(): UseLoginFlowResult {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [step, setStep] = useState<LoginStep>('credentials')
  const [resetDestination, setResetDestination] = useState('')

  const selectContext = (role: Portal) => {
    login(role)
    navigate(`/${role}`) // supplier portal lands in Phase 4
  }

  const onAuthenticated = (result: LoginResult) => {
    if (result.requiresContinueAs) {
      setStep('continueAs')
    } else {
      selectContext(result.roles[0])
    }
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
    selectContext,
  }
}
