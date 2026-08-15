import { useState } from 'react'
import { cleanMobile, isSaudiMobile } from '@/shared/lib/validators'

export type ResetChannel = 'email' | 'sms'

// Same email rule as the register wizard (AccountDetailsStep); the phone reuses the shared
// Saudi-mobile validation (isSaudiMobile) + cleanMobile so this field behaves exactly like register.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface UseForgotPasswordOptions {
  /**
   * The reset code has been "sent" → advance to the OTP step, carrying the destination and the
   * channel it went to (the OTP screen needs the channel to size the code: SMS 4, email 6).
   */
  onCodeSent: (destination: string, channel: ResetChannel) => void
}

/** State for the reset-request card, with no markup. */
export interface UseForgotPasswordResult {
  channel: ResetChannel
  setChannel: (channel: ResetChannel) => void
  email: string
  setEmail: (value: string) => void
  mobile: string
  setMobile: (value: string) => void
  /** Per-field validity → drives the inline error + green success check (mirrors register). */
  emailValid: boolean
  mobileValid: boolean
  /** The active destination is valid for the selected channel. */
  canSend: boolean
  /** True while the mock request is in flight (drives the button loader). */
  isSending: boolean
  send: () => void
}

/**
 * useForgotPassword — the reset-request behavior, with no markup. Picks an email/SMS
 * channel and validates the matching destination. The "send" is a mock (client-side
 * delay); swap it for `api.requestPasswordReset` when the BFF exists. A successful send
 * hands the destination up so the OTP screen can show where the code went.
 */
export function useForgotPassword({ onCodeSent }: UseForgotPasswordOptions): UseForgotPasswordResult {
  const [channel, setChannel] = useState<ResetChannel>('email')
  const [email, setEmail] = useState('')
  const [mobile, setMobileRaw] = useState('')
  const [isSending, setIsSending] = useState(false)
  // Mirror the register field: strip the +966 country code / leading 0 so we store the 9-digit local part.
  const setMobile = (value: string) => setMobileRaw(cleanMobile(value))

  const emailValid = EMAIL_RE.test(email)
  const mobileValid = isSaudiMobile(mobile)
  const canSend = channel === 'email' ? emailValid : mobileValid

  const send = () => {
    if (!canSend || isSending) return
    setIsSending(true)
    const destination = channel === 'email' ? email : `+966${mobile}`
    window.setTimeout(() => {
      setIsSending(false)
      onCodeSent(destination, channel)
    }, 700)
  }

  return { channel, setChannel, email, setEmail, mobile, setMobile, emailValid, mobileValid, canSend, isSending, send }
}
