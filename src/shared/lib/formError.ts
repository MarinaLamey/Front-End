import type { FieldError } from 'react-hook-form'
import type { UiError } from '@/shared/ui/types'

/** Map a react-hook-form field error into the design system's typed UiError shape. */
export function fieldError(error?: FieldError): UiError | undefined {
  return error ? { title: error.message ?? 'Invalid value' } : undefined
}
