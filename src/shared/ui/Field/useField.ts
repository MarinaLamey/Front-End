import { useId } from 'react'
import { cn } from '@/shared/lib/cn'
import type { InputProps } from '@/shared/ui/Input'
import type { UiError } from '@/shared/ui/types'

export interface FieldProps
  extends Omit<InputProps, 'id' | 'error' | 'errorId' | 'aria-describedby'> {
  /** Visible label, associated to the control via htmlFor/id. */
  label: string
  /** Guidance shown beneath the control; the error message replaces it when invalid. */
  helperText?: string
  /** Typed validation error. Drives the danger state and renders the message. */
  error?: UiError | null
  required?: boolean
  /** Override the auto-generated id (e.g. to match an external label). */
  id?: string
  /** Classes for the field wrapper (the control keeps its own styling). */
  className?: string
}

/** Everything the presentational shell needs — already computed. No JSX in here. */
export interface UseFieldResult {
  wrapperClassName: string
  labelProps: { htmlFor: string }
  /** Spread onto the inner <Input> (alongside the forwarded ref). */
  controlProps: Pick<InputProps, 'id' | 'required' | 'error' | 'errorId' | 'aria-describedby'> &
    Omit<FieldProps, 'label' | 'helperText' | 'error' | 'required' | 'id' | 'className'>
  hasError: boolean
  errorId: string
  helperId: string
}

/**
 * useField — the a11y wiring of a labelled control, with no markup.
 *
 * Generates the stable ids and connects label↔control↔message: the control points at the
 * helper only when valid (the error link is owned by Input via `errorId`, so wiring both
 * would duplicate the id). Returns prop bags the shell spreads onto label, Input, and the
 * message paragraph.
 */
export function useField(props: FieldProps): UseFieldResult {
  const { label, helperText, error = null, required = false, id, className, ...inputProps } = props

  const generatedId = useId()
  const controlId = id ?? generatedId
  const errorId = `${controlId}-error`
  const helperId = `${controlId}-helper`

  const hasError = error != null
  // Point the control at the helper only when there's no error; the error link is
  // added by Input itself (via `errorId`), so wiring both here would duplicate the id.
  const describedBy = !hasError && helperText ? helperId : undefined

  return {
    wrapperClassName: cn('flex flex-col gap-1.5', className),
    labelProps: { htmlFor: controlId },
    controlProps: {
      id: controlId,
      required,
      error,
      errorId: hasError ? errorId : undefined,
      'aria-describedby': describedBy,
      ...inputProps,
    },
    hasError,
    errorId,
    helperId,
  }
}
