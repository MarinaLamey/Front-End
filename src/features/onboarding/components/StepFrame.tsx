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
    // Content-height (no inner scroll): the body grows with its content and the footer sits
    // below it. If a long step exceeds the viewport, the whole PAGE scrolls — not this box.
    <div className="flex h-full min-h-[560px] flex-col">
      <div className="auth-stagger flex-1 px-6 py-6 sm:px-10 sm:py-8 lg:px-12">
        <BrandHeader title={title} subtitle={subtitle} />
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="shrink-0 border-t border-border-subtle px-6 py-4 sm:px-10 lg:px-12">{footer}</div>}
    </div>
  )
}
