import { useState } from 'react'

export type ResetChannel = 'email' | 'sms'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const MOBILE_RE = /^(?:\+9665\d{8}|05\d{8}|5\d{8})$/

interface UseForgotPasswordOptions {
  /** The reset code has been "sent" → advance to the OTP step, carrying the destination. */
  onCodeSent: (destination: string) => void
}

/** State for the reset-request card, with no markup. */
export interface UseForgotPasswordResult {
  channel: ResetChannel
  setChannel: (channel: ResetChannel) => void
  email: string
  setEmail: (value: string) => void
  mobile: string
  setMobile: (value: string) => void
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
  const [mobile, setMobile] = useState('')
  const [isSending, setIsSending] = useState(false)

  const canSend =
    channel === 'email' ? EMAIL_RE.test(email) : MOBILE_RE.test(mobile.replace(/\s/g, ''))

  const send = () => {
    if (!canSend || isSending) return
    setIsSending(true)
    const destination = channel === 'email' ? email : mobile
    window.setTimeout(() => {
      setIsSending(false)
      onCodeSent(destination)
    }, 700)
  }

  return { channel, setChannel, email, setEmail, mobile, setMobile, canSend, isSending, send }
}
