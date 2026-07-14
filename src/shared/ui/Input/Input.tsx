import { forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'
import { useInput, type InputProps } from './useInput'

export type { InputProps, InputSize } from './useInput'

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn('animate-spin text-content-tertiary', className)}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/** Green success check shown in the trailing slot when the field passes validation. */
function SuccessCheck() {
  return (
    <span aria-hidden="true" className="inline-flex shrink-0 text-status-success motion-safe:animate-check-pop">
      
    </span>
  )
}

/**
 * Input — presentational shell over {@link useInput}. The hook owns the ref, the
 * click-to-focus behavior, style resolution and the typed-error a11y wiring; this file
 * only lays out the wrapper, the native <input>, and the trailing adornment.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(props, ref) {
  const {
    inputRef,
    wrapperProps,
    inputProps,
    leftIcon,
    rightIcon,
    trailingAction,
    isLoading,
    spinnerClassName,
    showSuccessCheck,
    statusText,
  } = useInput(props, ref)

  return (
    <div {...wrapperProps}>
      {leftIcon != null && (
        <span aria-hidden="true" className="inline-flex shrink-0 text-content-tertiary">
          {leftIcon}
        </span>
      )}

      <input ref={inputRef} {...inputProps} />

      {isLoading ? (
        <Spinner className={cn('shrink-0', spinnerClassName)} />
      ) : trailingAction ? (
        <button
          type="button"
          aria-label={trailingAction.label}
          aria-pressed={trailingAction.pressed}
          onClick={trailingAction.onClick}
          className="inline-flex shrink-0 text-content-tertiary hover:text-content-primary "
        >
          {trailingAction.icon}
        </button>
      ) : showSuccessCheck ? (
        <SuccessCheck />
      ) : (
        rightIcon != null && (
          <span aria-hidden="true" className="inline-flex shrink-0 text-content-tertiary">
            {rightIcon}
          </span>
        )
      )}

      {/* Announce validation failures to assistive tech (visible message is the parent's job). */}
      <span role="status" aria-live="polite" className="sr-only">
        {statusText}
      </span>
    </div>
  )
})
