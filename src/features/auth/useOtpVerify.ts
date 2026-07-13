import { useEffect, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api, toUiError } from '@/platform/api'
import type { UiError } from '@/shared/ui/types'

const OTP_LENGTH = 6

interface UseOtpVerifyOptions {
  orgId: string
  /** epoch ms when "Resend" first becomes available (from the issued challenge). */
  initialResendAt: number
  /** Code accepted → advance the flow. */
  onVerified: () => void
}

/** The OTP step's behavior, with no markup. */
export interface UseOtpVerifyResult {
  code: string
  /** Set from raw input — digits only, capped at 6. */
  setCode: (raw: string) => void
  isComplete: boolean
  verify: () => void
  isVerifying: boolean
  verifyError: UiError | null
  resend: () => void
  isResending: boolean
  /** True once the resend countdown has elapsed. */
  canResend: boolean
  /** Seconds remaining until resend is allowed (0 when ready). */
  secondsLeft: number
}

/**
 * useOtpVerify — verification-code entry, with no markup.
 *
 * Owns the sanitized code, the verify + resend mutations (mock/BFF), and the live resend
 * countdown derived from the challenge's `resendAvailableAt`. A successful verify calls
 * `onVerified`; a resend resets the code and restarts the countdown.
 */
export function useOtpVerify({
  orgId,
  initialResendAt,
  onVerified,
}: UseOtpVerifyOptions): UseOtpVerifyResult {
  const [code, setCodeState] = useState('')
  const [resendAt, setResendAt] = useState(initialResendAt)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [])

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000))

  const verifyMutation = useMutation({
    mutationFn: () => api.verifyOtp(orgId, code),
    onSuccess: onVerified,
  })

  const resendMutation = useMutation({
    mutationFn: () => api.resendOtp(orgId),
    onSuccess: (otp) => {
      setResendAt(otp.resendAvailableAt)
      setCodeState('')
    },
  })

  return {
    code,
    setCode: (raw) => setCodeState(raw.replace(/\D/g, '').slice(0, OTP_LENGTH)),
    isComplete: code.length === OTP_LENGTH,
    verify: () => verifyMutation.mutate(),
    isVerifying: verifyMutation.isPending,
    verifyError: verifyMutation.error ? toUiError(verifyMutation.error) : null,
    resend: () => resendMutation.mutate(),
    isResending: resendMutation.isPending,
    canResend: secondsLeft <= 0,
    secondsLeft,
  }
}
