import { type ReactNode } from 'react'
import { BrandLogo } from '@/shared/ui/BrandLogo'

interface StepFrameProps {
  /** Left-aligned heading. Omit for screens that render their own (e.g. a centered header). */
  title?: string
  subtitle?: string
  children: ReactNode
  /** Sticky footer (back / continue, or KYC actions). Omit for a footer-less screen. */
  footer?: ReactNode
}

/**
 * StepFrame — the form-side chrome for a wizard/KYC screen: brand logo, heading + subtitle,
 * a scrollable body, and an optional sticky footer. Keeps every step visually consistent so
 * a step only owns its fields.
 */
export function StepFrame({ title, subtitle, children, footer }: StepFrameProps) {
  return (
    // Content-height (no inner scroll). h-full fills the card; the body grows with content
    // and the footer stays at the bottom. If content exceeds the viewport, the page scrolls.
    <div className="flex h-full min-h-[560px] flex-col">
      <div className="flex-1 px-6 py-6 sm:px-10 sm:py-8 lg:px-12">
        <BrandLogo className="h-8 w-auto" />
        {title && <h1 className="mt-4 text-2xl font-semibold leading-8 text-content-primary">{title}</h1>}
        {subtitle && <p className="mt-1.5 text-base text-content-secondary">{subtitle}</p>}
        <div className="mt-6">{children}</div>
      </div>

      {footer && <div className="shrink-0 border-t border-border-subtle px-6 py-4 sm:px-10 lg:px-12">{footer}</div>}
    </div>
  )
}
