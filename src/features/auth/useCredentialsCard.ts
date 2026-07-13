import { useMemo, useState } from 'react'
import { useForm, type UseFormRegister, type UseFormHandleSubmit } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useTranslation } from 'react-i18next'
import { useMutation } from '@tanstack/react-query'
import { api, toUiError, type LoginResult } from '@/platform/api'
import type { UiError } from '@/shared/ui/types'
import { useGoogleSignIn } from './useGoogleSignIn'
import { makeLoginSchema, type LoginValues } from './schemas'

interface UseCredentialsCardOptions {
  /** Called with the login result once identity is verified — the flow takes it from here. */
  onAuthenticated: (result: LoginResult) => void
}

/** Everything the presentational card needs — form API, handlers, view state. */
export interface UseCredentialsCardResult {
  register: UseFormRegister<LoginValues>
  handleSubmit: UseFormHandleSubmit<LoginValues>
  errors: ReturnType<typeof useForm<LoginValues>>['formState']['errors']
  showPassword: boolean
  toggleShowPassword: () => void
  /** True while the login request is in flight (drives the tracing-border loader). */
  isSubmitting: boolean
  /** Typed server error from the login call (e.g. invalid credentials). */
  submitError: UiError | null
  /** Validated-submit handler — pass to `handleSubmit(onSubmit)`. */
  onSubmit: (values: LoginValues) => void
  /** Begin the real Google OAuth flow (advances the flow on success). */
  googleSignIn: () => void
  /** Mock social/phone sign-in (Apple, phone) — advances the flow as the demo org. */
  socialSignIn: () => void
}

/**
 * useCredentialsCard — the sign-in card's behavior, with no markup.
 *
 * Builds the i18n-aware schema + react-hook-form instance, owns show-password state, and
 * calls the mock/BFF `login`. On success it hands the {@link LoginResult} to the flow
 * (which decides single- vs dual-role routing); failures surface as a typed error.
 */
export function useCredentialsCard({
  onAuthenticated,
}: UseCredentialsCardOptions): UseCredentialsCardResult {
  const { t } = useTranslation()
  const [showPassword, setShowPassword] = useState(false)

  const schema = useMemo(() => makeLoginSchema(t), [t])
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '', rememberMe: false },
  })

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) => api.login(email, password),
    onSuccess: onAuthenticated,
  })

  const onSubmit = (values: LoginValues) => {
    loginMutation.mutate({ email: values.email, password: values.password })
  }

  // Social / phone sign-in. Mock-first: a verified social identity resolves to the demo
  // org and advances the flow. Swap for the real provider → BFF token exchange later.
  const socialMutation = useMutation({
    mutationFn: () => api.login('demo@mi-proc.sa', 'password'),
    onSuccess: onAuthenticated,
  })
  const socialSignIn = () => socialMutation.mutate()

  // Real Google OAuth; on a verified identity, advance the flow (mock session for now).
  const { signIn: googleSignIn } = useGoogleSignIn((user) => {
    console.info('Signed in with Google:', user.email)
    socialSignIn()
  })

  return {
    register,
    handleSubmit,
    errors,
    showPassword,
    toggleShowPassword: () => setShowPassword((prev) => !prev),
    isSubmitting: loginMutation.isPending,
    submitError: loginMutation.error ? toUiError(loginMutation.error) : null,
    onSubmit,
    googleSignIn,
    socialSignIn,
  }
}
