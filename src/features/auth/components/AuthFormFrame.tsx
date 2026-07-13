import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { BrandHeader } from '@/shared/ui/BrandHeader'

interface AuthFormFrameProps {
  title: string
  subtitle?: string
  /** Center the logo, media, and text (used by the "Password updated" screen). */
  centered?: boolean
  /** Optional visual between the logo and title (e.g. the success check). */
  media?: ReactNode
  children?: ReactNode
}

/**
 * AuthFormFrame — the form-side chrome for every auth screen: the shared {@link BrandHeader}
 * (logo + heading + subtitle) over a vertically-centered body. The onboarding wizard uses
 * StepFrame instead (scroll + sticky footer for long forms); auth screens are short, so this
 * is their lighter analog. Reused by sign-in, phone, reset, new-password, and the success screen.
 */
export function AuthFormFrame({ title, subtitle, centered = false, media, children }: AuthFormFrameProps) {
  return (
    // Content-height (no inner scroll): fills the card and vertically centers the short auth
    // content, with a min-height baseline. If content ever exceeds the viewport, the page scrolls.
    <div
      className={cn(
        // w-full + max-w caps the form narrow; mx-auto centers it in the (wider) form column.
        // auth-stagger cascades the logo → title → subtitle → form in on mount / step change.
        'auth-stagger mx-auto flex h-full min-h-[560px] w-full max-w-[500px] flex-col justify-center px-6 py-10 sm:px-10',
        centered && 'items-center text-center',
      )}
    >
      <BrandHeader title={title} subtitle={subtitle} media={media} centered={centered} />

      {children && <div className={cn('mt-6', centered && 'w-full')}>{children}</div>}
    </div>
  )
}
