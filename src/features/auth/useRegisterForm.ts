import { useEffect, useMemo, useRef, useState } from 'react'
import { useForm, type UseFormRegister, type UseFormHandleSubmit } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { api, toUiError, type OnboardingRole, type OtpChallenge, type OtpChannel } from '@/platform/api'
import type { UiError } from '@/shared/ui/types'
import { makeRegisterSchema, type RegisterValues } from './schemas'

/** Registration role choice — "both" expands to [buyer, supplier]. */
export type RegisterRole = 'buyer' | 'supplier' | 'both'

interface UseRegisterFormOptions {
  /** Called after the org is created and an OTP is issued → advance to verification. */
  onRegistered: (result: {
    orgId: string
    otp: OtpChallenge
    roles: OnboardingRole[]
    /** The actual email/mobile the code was sent to (for the OTP screen copy). */
    destination: string
  }) => void
}

/** Everything the presentational form needs — form API, role selection, view state. */
export interface UseRegisterFormResult {
  register: UseFormRegister<RegisterValues>
  handleSubmit: UseFormHandleSubmit<RegisterValues>
  errors: ReturnType<typeof useForm<RegisterValues>>['formState']['errors']
  isValid: boolean
  role: RegisterRole
  selectRole: (id: RegisterRole) => void
  tracedRole: RegisterRole | null
  /** Channel the OTP is sent to — chosen at registration (HLD §5.2). */
  otpChannel: OtpChannel
  setOtpChannel: (channel: OtpChannel) => void
  /** Validated-submit handler — pass to `handleSubmit(onSubmit)`. */
  onSubmit: (values: RegisterValues) => void
  /** True while the register request is in flight (drives the tracing-border loader). */
  isSubmitting: boolean
  /** Typed server error from the register call (e.g. CR/email already exists). */
  submitError: UiError | null
}

function rolesFor(role: RegisterRole): OnboardingRole[] {
  return role === 'both' ? ['buyer', 'supplier'] : [role]
}

/**
 * useRegisterForm — the sign-up form's behavior, with no markup.
 *
 * Owns the role selection (+ its transient "trace" highlight) and the react-hook-form
 * instance (live `isValid`, i18n-aware HLD schema). On submit it calls the mock/BFF
 * `register`, surfaces typed errors, and on success advances to OTP verification via
 * `onRegistered`. Timers are cleared on unmount.
 */
export function useRegisterForm({ onRegistered }: UseRegisterFormOptions): UseRegisterFormResult {
  const { t } = useTranslation()
  const [role, setRole] = useState<RegisterRole>('buyer')
  const [otpChannel, setOtpChannel] = useState<OtpChannel>('email')
  const [tracedRole, setTracedRole] = useState<RegisterRole | null>(null)
  const traceTimeout = useRef<number | null>(null)

  const schema = useMemo(() => makeRegisterSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterValues>({
    resolver: zodResolver(schema),
    mode: 'onChange', // keep isValid live so the button enables only when complete
    defaultValues: {
      organizationName: '',
      cr: '',
      mobile: '',
      email: '',
      password: '',
      confirmPassword: '',
      terms: false,
    },
  })

  const registerMutation = useMutation({
    mutationFn: api.register,
    // Derive roles + the OTP destination from the request itself (avoids stale closures).
    onSuccess: (res, variables) =>
      onRegistered({
        orgId: res.orgId,
        otp: res.otp,
        roles: variables.roles,
        destination: variables.preferredOtpChannel === 'mobile' ? variables.mobile : variables.email,
      }),
  })

  const onSubmit = (values: RegisterValues) => {
    registerMutation.mutate({
      organizationName: values.organizationName,
      cr: values.cr,
      mobile: values.mobile,
      email: values.email,
      password: values.password,
      roles: rolesFor(role),
      preferredOtpChannel: otpChannel,
    })
  }

  // Briefly trace the chosen role card on selection.
  const selectRole = (id: RegisterRole) => {
    setRole(id)
    setTracedRole(id)
    window.clearTimeout(traceTimeout.current ?? undefined)
    traceTimeout.current = window.setTimeout(() => setTracedRole(null), 900)
  }

  useEffect(() => () => window.clearTimeout(traceTimeout.current ?? undefined), [])

  return {
    register,
    handleSubmit,
    errors,
    isValid,
    role,
    selectRole,
    tracedRole,
    otpChannel,
    setOtpChannel,
    onSubmit,
    isSubmitting: registerMutation.isPending,
    submitError: registerMutation.error ? toUiError(registerMutation.error) : null,
  }
}
