import type { UiError } from '@/shared/ui/types'

/** Stable machine codes for every failure the onboarding API can return. */
export type ApiErrorCode =
  | 'CR_EXISTS'
  | 'EMAIL_EXISTS'
  | 'MOBILE_EXISTS'
  | 'ACCOUNT_NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'OTP_INVALID'
  | 'OTP_EXPIRED'
  | 'OTP_RESEND_THROTTLED'
  | 'CR_NOT_FOUND'
  | 'VAT_NOT_FOUND'
  | 'VALIDATION_FAILED'
  | 'NOT_FOUND'

export interface ApiErrorOptions {
  /** Reassuring extra context, surfaced under the title. */
  detail?: string
  /** Name of the form field this error belongs to (lets a form target the right input). */
  field?: string
}

/**
 * The only rejection type the API throws. Carries a machine `code` (branch on it),
 * a human `message` (the title shown to users), an optional `detail`, and the `field`
 * it pertains to. {@link toUiError} converts it to the shape the UI primitives accept.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode
  readonly detail?: string
  readonly field?: string

  constructor(code: ApiErrorCode, message: string, options: ApiErrorOptions = {}) {
    super(message)
    this.name = 'ApiError'
    this.code = code
    this.detail = options.detail
    this.field = options.field
    // Keep `instanceof ApiError` working when targeting older JS.
    Object.setPrototypeOf(this, ApiError.prototype)
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

/**
 * Map any thrown value to the `UiError` shape the Field/Button primitives require
 * (Pillar 4 — it's structurally impossible to render a raw string). Unknown failures
 * collapse to a safe generic message.
 */
export function toUiError(error: unknown): UiError {
  if (isApiError(error)) {
    return { title: error.message, detail: error.detail }
  }
  return { title: 'Something went wrong', detail: 'Please try again in a moment.' }
}
