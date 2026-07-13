import { useEffect, useState } from 'react'

interface UseOtpOptions {
  /** Number of digits (default 4). */
  length?: number
  /** Resend cooldown window in seconds (default 30). */
  resendSeconds?: number
  /** Called by `submit()` once the code is complete. */
  onVerify?: (code: string) => void
  /** Called by `resend()` before the countdown restarts. */
  onResend?: () => void
}

/** Uniform OTP state shared by every code screen (register verify, phone login, reset). */
export interface UseOtpResult {
  code: string
  /** Set the code from raw input — non-digits stripped, clamped to `length`. */
  setCode: (raw: string) => void
  clear: () => void
  isComplete: boolean
  length: number
  /** Verify when complete → `onVerify(code)`. */
  submit: () => void
  /** `onResend()` then restart the cooldown. */
  resend: () => void
  /** (Re)start the resend cooldown — call after a code is sent. */
  startCountdown: () => void
  secondsLeft: number
  canResend: boolean
}

/**
 * useOtp — the one OTP behavior used across the app: digit sanitisation, completeness, and
 * the resend cooldown. The actual send/verify transport stays with each caller (mock delay,
 * or a react-query mutation); this hook only owns the code + timer so every OTP screen
 * behaves and counts down identically. Pairs with the presentational {@link OtpField}.
 */
export function useOtp({ length = 4, resendSeconds = 30, onVerify, onResend }: UseOtpOptions = {}): UseOtpResult {
  const [code, setCodeState] = useState('')
  const [resendAt, setResendAt] = useState(0)
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    if (resendAt === 0) return
    const timer = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(timer)
  }, [resendAt])

  const secondsLeft = Math.max(0, Math.ceil((resendAt - now) / 1000))
  const isComplete = code.length === length

  const setCode = (raw: string) => setCodeState(raw.replace(/\D/g, '').slice(0, length))
  const startCountdown = () => {
    const t = Date.now()
    setNow(t)
    setResendAt(t + resendSeconds * 1000)
  }

  return {
    code,
    setCode,
    clear: () => setCodeState(''),
    isComplete,
    length,
    submit: () => {
      if (isComplete) onVerify?.(code)
    },
    resend: () => {
      onResend?.()
      startCountdown()
    },
    startCountdown,
    secondsLeft,
    canResend: secondsLeft <= 0,
  }
}

/** Format a seconds count as `m:ss` for the resend countdown. */
export function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
