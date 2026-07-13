import { cn } from '@/shared/lib/cn'
import { TracingBorder } from '@/shared/ui/TracingBorder'
import type { UiError } from '@/shared/ui/types'
import { useOtpField } from './useOtpField'

interface OtpFieldProps {
  /** Optional label above the boxes. */
  label?: string
  value: string
  /** Receives the sanitised digit string (non-digits stripped, clamped to `length`). */
  onChange: (digits: string) => void
  /** Number of digit boxes (default 4). */
  length?: number
  error?: UiError | null
  autoFocus?: boolean
  /**
   * Verifying — overlay a synchronized tracing-border loader on every cell. It shares the
   * `.mp-trace` timeline with the Verify button's {@link TracingBorder}, so the arc sweeps
   * all cells and the button as one. Boxes go read-only while it runs.
   */
  loading?: boolean
  /** Verified → green outline and the boxes lock (read-only), so the code can't be changed. */
  success?: boolean
}

/**
 * OtpField — the one segmented code input used across the app (register verify phone/email,
 * phone login, password reset). Pure presentation over {@link useOtpField}: it lays out the
 * boxes, the loading overlay, and the error message; the hook owns the refs, auto-advance,
 * and paste behavior. Pair with {@link useOtp} for the code + resend state.
 */
export function OtpField({
  label,
  value,
  onChange,
  length = 4,
  error = null,
  autoFocus,
  loading = false,
  success = false,
}: OtpFieldProps) {
  const { cells, getCellProps } = useOtpField({ value, onChange, length })

  return (
    <div className="flex flex-col gap-1.5">
      {label && <span className="text-sm font-medium text-content-primary">{label}</span>}

      <div className="flex gap-3" dir="ltr">
        {cells.map((_, i) => (
          <div key={i} className={cn('relative rounded-xl', loading && 'otp-shimmer')}>
            <input
              {...getCellProps(i)}
              type="text"
              inputMode="numeric"
              autoComplete={i === 0 ? 'one-time-code' : 'off'}
              autoFocus={autoFocus && i === 0}
              maxLength={1}
              // Lock the boxes once verified (or mid-verify) so the code can't be changed.
              readOnly={loading || success}
              aria-label={`${label ?? 'Digit'} ${i + 1}`}
              aria-invalid={error ? true : undefined}
              className={cn(
                'h-14 w-14 rounded-xl bg-bg-surface text-center text-2xl font-bold text-content-primary',
                'outline outline-1 -outline-offset-1 transition-colors',
                'focus:outline-2 focus:-outline-offset-2 focus:outline-border-focus',
                success
                  ? 'outline-status-success focus:outline-status-success'
                  : error
                    ? 'outline-border-danger'
                    : 'outline-border-default',
                success && 'cursor-default text-status-success',
              )}
            />
            {loading && <TracingBorder radius={12} />}
          </div>
        ))}
      </div>

      {error && (
        <p role="alert" className="text-sm text-status-danger">
          {error.title}
        </p>
      )}
    </div>
  )
}
