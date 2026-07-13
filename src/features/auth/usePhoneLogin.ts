import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, toUiError, type LoginResult } from '@/platform/api'
import type { UiError } from '@/shared/ui/types'
import { useOtp } from '@/shared/ui/OtpField'

interface UsePhoneLoginOptions {
  /** Called with the resolved session once the OTP is verified. */
  onAuthenticated: (result: LoginResult) => void
}

/** Two-phase passwordless phone login: enter number → enter the texted code. */
export interface UsePhoneLoginResult {
  phase: 'number' | 'code'
  mobile: string
  setMobile: (value: string) => void
  /** Send the OTP to the entered number → advances to the code phase. */
  requestOtp: () => void
  isRequesting: boolean
  requestError: UiError | null
  code: string
  setCode: (raw: string) => void
  isComplete: boolean
  verify: () => void
  isVerifying: boolean
  verifyError: UiError | null
  resend: () => void
  isResending: boolean
  canResend: boolean
  secondsLeft: number
  /** Back from the code phase to the number phase. */
  toNumber: () => void
}

/**
 * usePhoneLogin — the phone-OTP login flow, with no markup.
 *
 * Phase 1 sends an OTP to a registered mobile (mock SMS). Phase 2 verifies the code and
 * resolves the session like a normal login (the flow then routes to Continue-as or the
 * dashboard). Code state + resend countdown come from the shared {@link useOtp}; this hook
 * owns only the transport (the request/verify/resend mutations) and the phase.
 */
export function usePhoneLogin({ onAuthenticated }: UsePhoneLoginOptions): UsePhoneLoginResult {
  const [phase, setPhase] = useState<'number' | 'code'>('number')
  const [mobile, setMobile] = useState('')
  const [orgId, setOrgId] = useState<string | null>(null)

  const otp = useOtp()

  const requestMutation = useMutation({
    mutationFn: () => api.requestLoginOtp(mobile),
    onSuccess: (result) => {
      setOrgId(result.orgId)
      otp.clear()
      otp.startCountdown()
      setPhase('code')
    },
  })

  const verifyMutation = useMutation({
    mutationFn: () => api.verifyLoginOtp(orgId as string, otp.code),
    onSuccess: onAuthenticated,
  })

  const resendMutation = useMutation({
    mutationFn: () => api.resendOtp(orgId as string),
    onSuccess: () => {
      otp.clear()
      otp.startCountdown()
    },
  })

  return {
    phase,
    mobile,
    setMobile,
    requestOtp: () => requestMutation.mutate(),
    isRequesting: requestMutation.isPending,
    requestError: requestMutation.error ? toUiError(requestMutation.error) : null,
    code: otp.code,
    setCode: otp.setCode,
    isComplete: otp.isComplete,
    verify: () => verifyMutation.mutate(),
    isVerifying: verifyMutation.isPending,
    verifyError: verifyMutation.error ? toUiError(verifyMutation.error) : null,
    resend: () => resendMutation.mutate(),
    isResending: resendMutation.isPending,
    canResend: otp.canResend,
    secondsLeft: otp.secondsLeft,
    toNumber: () => setPhase('number'),
  }
}
