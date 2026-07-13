import { forwardRef } from 'react'
import { cn } from '@/shared/lib/cn'
import { useButton, type ButtonProps } from './useButton'

export type { ButtonProps, ButtonVariant, ButtonSize } from './useButton'

function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
    </svg>
  )
}

/** Pulsing dot for the non-blocking pending/optimistic states (opacity only). */
function StatusDot({ tone }: { tone: 'pending' | 'optimistic' }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'h-1.5 w-1.5 shrink-0 rounded-full motion-safe:animate-pulse',
        tone === 'pending' ? 'bg-amber-400' : 'bg-emerald-400',
      )}
    />
  )
}

/**
 * Button — presentational shell over {@link useButton}. All behavior (styling resolution,
 * the async/disabled state machine, a11y wiring, click guarding) lives in the hook; this
 * file is markup only. The four pillars are satisfied by the hook's output: native
 * <button> + ARIA (P1), transform/opacity-only motion with zero CLS (P2), visual-only
 * async flags (P3), and a typed error contract (P4).
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(props, ref) {
  const {
    rootProps,
    contentClassName,
    isLoading,
    spinnerClassName,
    showDot,
    dotTone,
    statusText,
    leftIcon,
    rightIcon,
    children,
  } = useButton(props)

  return (
    <button ref={ref} {...rootProps}>
      {/* Visible content keeps its footprint while loading (spinner overlays it) → zero CLS. */}
      <span className={contentClassName}>
        {leftIcon != null && (
          <span aria-hidden="true" className="inline-flex shrink-0">
            {leftIcon}
          </span>
        )}
        {children}
        {rightIcon != null && (
          <span aria-hidden="true" className="inline-flex shrink-0">
            {rightIcon}
          </span>
        )}
        {showDot && <StatusDot tone={dotTone} />}
      </span>

      {isLoading && (
        <span className="absolute inset-0 grid place-items-center">
          <Spinner className={spinnerClassName} />
        </span>
      )}

      {/* Single live region announces async state changes to assistive tech. */}
      <span role="status" aria-live="polite" className="sr-only">
        {statusText}
      </span>
    </button>
  )
})
