import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'

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
    // Column: top-bar row, then the card centered in the space below it. The card is
    // content-height (no inner scroll); if it's ever taller than the viewport the whole
    // page scrolls (min-h-screen grows rather than clipping).
    <div className="flex  min-h-screen  flex-col bg-bg-canvas px-5 py-6">
      {topBar && <div className="flex shrink-0 justify-end gap-2">{topBar}</div>}
    
      <div className="flex flex-1 items-center  justify-center   ">
        {/* Card shape from Figma: TL/BL 24, TR 0, BR 120 (the big sweep). Logical corners so
            the sweep sits on the panel's far-bottom corner and flips in RTL. */}
        <div className="flex w-full max-w-[1024px] max-h-[620px]  overflow-hidden rounded-ss-[24px] rounded-es-[24px] rounded-ee-[24px] border border-border-subtle bg-bg-surface shadow-[0px_25px_50px_rgba(16,24,40,0.25),0px_20px_25px_rgba(16,24,40,0.10)] lg:rounded-ee-[120px]">
          {/* Form side */}
          <div className="flex min-w-0 flex-1 flex-col">{children}</div>

          {/* Gradient panel — 120 sweep on the top-inner corner, revealing the card behind. */}
          <aside className={cn('hidden shrink-0 p-10 lg:flex lg:items-center lg:rounded-ss-[120px]', asideClassName)}>
            {aside}
          </aside>
        </div>
      </div>
    </div>
  )
}
