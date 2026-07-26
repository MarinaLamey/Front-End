import { type ReactNode } from 'react'
import { BrandHeader } from '@/shared/ui/BrandHeader'

interface StepFrameProps {
  /** Left-aligned heading. Omit for screens that render their own (e.g. a centered header). */
  title?: string
  subtitle?: string
  children: ReactNode
  /** Sticky footer (back / continue, or KYC actions). Omit for a footer-less screen. */
  footer?: ReactNode
}

/**
 * StepFrame — the form-side chrome for a wizard/KYC screen: the shared {@link BrandHeader}
 * (logo + heading + subtitle), a scrollable body, and an optional sticky footer. Keeps every
 * step visually consistent so a step only owns its fields.
 */
export function StepFrame({ title, subtitle, children, footer }: StepFrameProps) {
  return (
    // The card is a fixed height (SplitShell); content is TOP-aligned so the logo/header sit at
    // the same position on every step regardless of how many fields the step has (a step with
    // fewer inputs just leaves space above the pinned footer). No inner scroll.
    <div className="flex h-full min-h-[560px] flex-col">
      <div className="auth-stagger flex-1 px-6 py-5 sm:px-10 lg:px-12">
        <BrandHeader title={title} subtitle={subtitle} />
        <div className="mt-4">{children}</div>
      </div>

      {footer && <div className="shrink-0 border-t border-border-subtle px-6 py-3.5 sm:px-10 lg:px-12">{footer}</div>}
    </div>
  )
}
