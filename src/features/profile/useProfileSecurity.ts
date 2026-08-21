import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { isApiError, type ApiErrorCode } from '@/platform/api'
import type { UiError } from '@/shared/ui/types'
import { profileKeys, useProfile } from './useProfile'
import { profileSecurityApi, type ContactChannel } from './services/profileApi'

export type { ContactChannel }

/**
 * The three verified changes on the profile — email, phone, password — as hooks.
 *
 * They are separate from {@link useSaveProfile} because none of them is a form field: each sends a
 * code to a destination and only commits once that code comes back. The mutation returns the
 * authoritative record and we project it with `setQueryData` (Pillar 3) — never an invalidate,
 * which would throw away the record the server just handed us and refetch it.
 */

/** What the change-contact dialog needs, flattened the way the auth hooks flatten theirs. */
export interface UpdateContactFlow {
  /** Where the code went. Empty until step 1 succeeds — which is what puts the dialog on step 2. */
  destination: string
  send: (destination: string) => void
  isSending: boolean
  sendError: UiError | null
  confirm: (code: string) => void
  isConfirming: boolean
  confirmError: UiError | null
  /** Send a fresh code to the same destination. */
  resend: () => void
  /** Drop a stale failure once the person starts typing again. Keeps the step. */
  clearErrors: () => void
  /** Back to step 1 with nothing in flight — called when the dialog closes. */
  reset: () => void
}

/** The password dialog's three steps: send a code, verify it, then choose the new password. */
export interface UpdatePasswordFlow {
  destination: string
  /** The code has been accepted → the dialog moves to the new-password step. */
  verified: boolean
  send: () => void
  isSending: boolean
  sendError: UiError | null
  verify: (code: string) => void
  isVerifying: boolean
  verifyError: UiError | null
  save: (password: string) => void
  isSaving: boolean
  saveError: UiError | null
  resend: () => void
  clearErrors: () => void
  reset: () => void
}

interface FlowOptions {
  /** The change committed — the caller closes the dialog. */
  onDone: () => void
}

/**
 * Mock failure codes → the localized message the dialog shows. The seam's own `message` is English
 * developer prose, so it is never rendered; an unmapped code falls back to the generic line rather
 * than leaking it.
 */
const ERROR_KEYS: Partial<Record<ApiErrorCode, string>> = {
  OTP_INVALID: 'profile.errors.codeInvalid',
  OTP_EXPIRED: 'profile.errors.codeExpired',
  VALIDATION_FAILED: 'auth.passwordRule',
}

/** Maps any rejection from the seam to the typed {@link UiError} the primitives accept. */
function useProfileError() {
  const { t } = useTranslation()
  return (error: unknown): UiError | null => {
    if (!error) return null
    const key = isApiError(error) ? ERROR_KEYS[error.code] : undefined
    return { title: t(key ?? 'profile.errors.generic') }
  }
}

/**
 * The email and phone changes are the same flow over different channels, so they are one hook —
 * the channel only decides where the code goes and how many digits it has.
 */
function useUpdateContact(channel: ContactChannel, { onDone }: FlowOptions): UpdateContactFlow {
  const { seat } = useProfile()
  const qc = useQueryClient()
  const toError = useProfileError()
  const [destination, setDestination] = useState('')

  const send = useMutation({
    mutationFn: (next: string) => profileSecurityApi.sendContactCode(seat, channel, next),
    onSuccess: (_void, next) => setDestination(next),
  })

  const confirm = useMutation({
    mutationFn: (code: string) => profileSecurityApi.confirmContactCode(seat, channel, code),
    onSuccess: (record) => {
      qc.setQueryData(profileKeys.detail(seat), record)
      // Forget the finished challenge, or the next Edit would open straight onto the code step of
      // a change that already landed.
      setDestination('')
      onDone()
    },
  })

  return {
    destination,
    send: (next) => send.mutate(next),
    isSending: send.isPending,
    sendError: toError(send.error),
    confirm: (code) => confirm.mutate(code),
    isConfirming: confirm.isPending,
    confirmError: toError(confirm.error),
    resend: () => {
      if (destination) send.mutate(destination)
    },
    clearErrors: () => {
      send.reset()
      confirm.reset()
    },
    reset: () => {
      setDestination('')
      send.reset()
      confirm.reset()
    },
  }
}

/** Change the email address — a 6-digit code to the NEW address confirms it. */
export function useUpdateEmail(options: FlowOptions): UpdateContactFlow {
  return useUpdateContact('email', options)
}

/** Change the mobile number — a 4-digit SMS code to the NEW number confirms it. */
export function useUpdatePhone(options: FlowOptions): UpdateContactFlow {
  return useUpdateContact('sms', options)
}

/**
 * Change the password. Deliberately the same three steps as the signed-out reset — send a code to
 * the address on file, trade it for a single-use token, spend the token on the new password — so
 * that the one flow behaves identically whether it is reached from the sign-in screen or from here.
 */
export function useUpdatePassword({ onDone }: FlowOptions): UpdatePasswordFlow {
  const { seat } = useProfile()
  const qc = useQueryClient()
  const toError = useProfileError()
  const [destination, setDestination] = useState('')
  const [resetToken, setResetToken] = useState('')

  const send = useMutation({
    mutationFn: () => profileSecurityApi.sendPasswordCode(seat),
    onSuccess: setDestination,
  })

  const verify = useMutation({
    mutationFn: (code: string) => profileSecurityApi.verifyPasswordCode(seat, code),
    onSuccess: setResetToken,
  })

  const save = useMutation({
    mutationFn: (password: string) => profileSecurityApi.setPassword(seat, resetToken, password),
    onSuccess: (record) => {
      qc.setQueryData(profileKeys.detail(seat), record)
      // As above: a spent token and a stale destination would reopen the dialog mid-flow.
      setDestination('')
      setResetToken('')
      onDone()
    },
  })

  return {
    destination,
    verified: resetToken !== '',
    send: () => send.mutate(),
    isSending: send.isPending,
    sendError: toError(send.error),
    verify: (code) => verify.mutate(code),
    isVerifying: verify.isPending,
    verifyError: toError(verify.error),
    save: (password) => save.mutate(password),
    isSaving: save.isPending,
    saveError: toError(save.error),
    resend: () => send.mutate(),
    clearErrors: () => {
      send.reset()
      verify.reset()
      save.reset()
    },
    reset: () => {
      setDestination('')
      setResetToken('')
      send.reset()
      verify.reset()
      save.reset()
    },
  }
}
