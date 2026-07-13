import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

/**
 * The mimony brand panel gradient — deep purple sweeping into teal (toward the bottom-inner
 * corner). Shared so sign-in (AuthShell) and registration (OnboardingLayout) render the
 * IDENTICAL panel; change it here to change both.
 */
export const BRAND_PANEL_GRADIENT =
  'bg-[linear-gradient(150deg,#4A3F8F_0%,#51489E_34%,#2C7E86_72%,#00AB98_100%)]'

interface SplitShellProps {
  /** Top-right controls (language + theme). Omitted → no top bar. */
  topBar?: ReactNode
  /** Right-panel content: the progress rail (register) or the marketing timeline (auth). */
  aside: ReactNode
  /** Width / gradient / extra classes for the gradient panel. */
  asideClassName?: string
  children: ReactNode
}

/**
 * SplitShell — the two-panel auth/onboarding card: the form on one side, a gradient panel
 * on the other, with optional top-right controls. Pure presentational and feature-agnostic:
 * callers inject the top bar and the panel content, so registration (OnboardingLayout) and
 * sign-in (AuthShell) share the EXACT same card without either feature depending on the
 * other. The panel flips to the leading edge in RTL for free (the card is a flex row that
 * follows `dir`).
 */
export function SplitShell({ topBar, aside, asideClassName, children }: SplitShellProps) {
  return (
    // Content-height: the page flows (min-h-screen grows) so there is NO inner scroll. The card
    // sizes to its content and centers in the viewport; if it's ever taller than the screen, the
    // whole PAGE scrolls rather than any box scrolling internally.
    <div className="flex min-h-screen flex-col bg-bg-canvas px-5 py-6">
      {topBar && <div className="flex shrink-0 justify-end gap-2">{topBar}</div>}

      {/* items-start (not center) so the card sits DIRECTLY under the top bar with no gap — the
          same position on sign-in and register regardless of card height. */}
      <div className="flex flex-1 items-start mt-2   justify-center">
        {/* Card shape from Figma: TL/BL 24, TR 0, BR 120 (the big sweep). Logical corners so
            the sweep sits on the panel's far-bottom corner and flips in RTL. */}
        <div className="flex w-full max-w-[500px] overflow-hidden rounded-ss-[24px] rounded-es-[24px] rounded-ee-[24px] border border-border-subtle bg-bg-surface shadow-[0px_25px_50px_rgba(16,24,40,0.25),0px_20px_25px_rgba(16,24,40,0.10)] motion-safe:animate-card-in lg:max-w-[1024px] lg:rounded-ee-[120px]">
          {/* Form side — grows with its content (no inner scroll). */}
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>

          {/* Gradient panel — stretches to the card height; content vertically centered. */}
          <aside className={cn('hidden shrink-0 p-10 lg:flex lg:items-center lg:rounded-ss-[120px]', asideClassName)}>
            {aside}
          </aside>
        </div>
      </div>
    </div>
  )
}
