import { forwardRef } from 'react'
import { Input } from '@/shared/ui/Input'
import { useField, type FieldProps } from './useField'

export type { FieldProps } from './useField'

/**
 * Field — presentational shell over {@link useField}: label + Input + helper/error
 * message. The hook does the accessibility wiring (htmlFor, aria-describedby,
 * aria-invalid via Input); this file only renders.
 *
 * Forwards its ref to the underlying <input>, so it drops into react-hook-form with
 * `{...register('name')}`.
 */
export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(props, ref) {
  const { label, helperText, error = null, required = false } = props
  const { wrapperClassName, labelProps, controlProps, hasError, errorId, helperId } = useField(props)

  return (
    <div className={wrapperClassName}>
      <label {...labelProps} className="text-sm font-medium text-content-primary">
        {label}
        {required && (
          <>
            <span aria-hidden="true" className="ms-0.5 text-status-danger">
              *
            </span>
            <span className="sr-only"> (required)</span>
          </>
        )}
      </label>

      <Input ref={ref} {...controlProps} />

      {hasError && error ? (
        <p id={errorId} className="text-sm text-status-danger">
          {error.title}
          {error.detail && <span className="text-content-tertiary"> — {error.detail}</span>}
        </p>
      ) : (
        helperText && (
          <p id={helperId} className="text-sm text-content-tertiary">
            {helperText}
          </p>
        )
      )}
    </div>
  )
})
