import { Component, Suspense, lazy, type ErrorInfo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { StaticGlyph } from './StaticGlyph'
import { VARIANT_KEY, type ErrorVariant } from './variants'

const ErrorAnimation = lazy(() => import('./ErrorAnimation'))

/**
 * Keeps a failing animation from taking the page down with it.
 *
 * This matters more here than anywhere else in the app: `ErrorState` is what renders when something
 * has ALREADY gone wrong, and the `offline` variant in particular runs at the exact moment a lazy
 * chunk cannot be fetched. If that throw escaped, a handled API error would turn into a blank
 * screen — the one outcome this component exists to prevent. The message and the retry button are
 * rendered outside the boundary, so they survive regardless.
 */
class AnimationBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Not surfaced to the user — the page is already telling them what went wrong.
    console.warn('[ErrorState] animation failed to render', error, info.componentStack)
  }

  render() {
    return this.state.failed ? <StaticGlyph /> : this.props.children
  }
}

export interface ErrorStateProps {
  /** Which failure this is. Defaults to `server` — the "we cannot classify it" case. */
  variant?: ErrorVariant
  /** Overrides the variant's default heading, e.g. "We couldn't load your dashboard". */
  title?: ReactNode
  /** Overrides the variant's default explanation. */
  message?: ReactNode
  /**
   * A short technical line under the message — an HTTP status, a request id. Optional on purpose:
   * it helps support, and it means nothing to most users, so it is styled as a footnote.
   */
  detail?: ReactNode
  /** Omit to render no retry button — correct for `forbidden`, where retrying cannot help. */
  onRetry?: () => void
  retryLabel?: string
  /** Spins the retry button while the refetch is in flight. */
  isRetrying?: boolean
  /** A second, lower-emphasis action (e.g. "Contact support"). */
  secondaryAction?: ReactNode
  className?: string
}

/**
 * ErrorState — the shared "this didn't load" block: a Lottie mark, a heading, an explanation, and
 * (usually) a way out. Used wherever a request can fail with nothing to show in its place.
 *
 * Copy comes from the variant unless overridden, so a caller only has to say WHAT failed, not
 * rewrite the wording for every screen. `role="alert"` announces it to a screen reader; the
 * animation is `aria-hidden` decoration.
 */
export function ErrorState({
  variant = 'server',
  title,
  message,
  detail,
  onRetry,
  retryLabel,
  isRetrying,
  secondaryAction,
  className,
}: ErrorStateProps) {
  const { t } = useTranslation()
  const key = VARIANT_KEY[variant]

  return (
    <div
      role="alert"
      className={cn('flex flex-col items-center gap-4 px-6 py-14 text-center', className)}
    >
      <div className="flex h-40 w-40 items-center justify-center">
        <AnimationBoundary>
          <Suspense fallback={<StaticGlyph />}>
            <ErrorAnimation variant={variant} />
          </Suspense>
        </AnimationBoundary>
      </div>

      <div className="flex flex-col items-center gap-1.5">
        <h2 className="text-lg font-semibold text-content-primary">
          {title ?? t(`common.error.${key}.title`)}
        </h2>
        <p className="max-w-sm text-sm text-content-tertiary">
          {message ?? t(`common.error.${key}.message`)}
        </p>
        {detail && <p className="text-xs text-content-disabled">{detail}</p>}
      </div>

      {(onRetry || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          {onRetry && (
            <Button size="sm" onClick={onRetry} isLoading={isRetrying}>
              {retryLabel ?? t('common.error.retry')}
            </Button>
          )}
          {secondaryAction}
        </div>
      )}
    </div>
  )
}
