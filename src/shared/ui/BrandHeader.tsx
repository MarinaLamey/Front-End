import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { BrandLogo } from '@/shared/ui/BrandLogo'

interface BrandHeaderProps {
  /** Left-aligned (or centered) heading. Optional for screens that render their own. */
  title?: string
  subtitle?: string
  /** Optional visual between the logo and title (e.g. the success check). */
  media?: ReactNode
  /** Constrain the subtitle width — used by the centered auth screens. */
  centered?: boolean
}

/**
 * BrandHeader — the shared top of every split-card form side: the mimony logo (75×54, elevated),
 * an optional media slot, then the title + subtitle. Extracted so auth ({@link AuthFormFrame})
 * and onboarding ({@link StepFrame}) — which differ only BELOW the header (centered vs
 * scroll+footer) — share ONE header, and the logo/branding lives in a SINGLE place.
 */
export function BrandHeader({ title, subtitle, media, centered = false }: BrandHeaderProps) {
  return (
    <>
      {/* In a flex column an <img> won't sit at the start on its own — pin it there unless the
          frame is the centered (success) variant, where the parent's items-center takes over. */}
      <BrandLogo className={cn('h-[70px] w-auto', !centered && 'self-start')} />
      {media && <div className="mt-6">{media}</div>}
      {title && <h1 className="mt-4 text-2xl font-semibold leading-8 text-content-primary">{title}</h1>}
      {subtitle && (  
        <p className={cn('mt-1.5 text-base text-content-secondary', centered && 'max-w-sm')}>{subtitle}</p>
      )}
    </>
  )
}
