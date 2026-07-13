import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { BrandLogo } from '@/shared/ui/BrandLogo'

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
 * AuthFormFrame — the form-side chrome for every auth screen: brand logo, heading +
 * subtitle, and a vertically-centered body. The register wizard uses StepFrame (scroll +
 * sticky footer for long forms); auth screens are short, so this is their lighter analog.
 * Reused by sign-in, phone, reset, new-password, and the success screen.
 */
export function AuthFormFrame({ title, subtitle, centered = false, media, children }: AuthFormFrameProps) {
  return (
    // Content-height (no inner scroll); h-full fills the card and centers the (short) auth
    // content. If it ever exceeds the viewport, the page scrolls.
    <div
      className={cn(
        'flex h-full min-h-[560px] flex-col justify-center px-6 py-10 sm:px-12',
        centered && 'items-center text-center',
      )}
    >
      
      <BrandLogo className="h-8 w-auto" />

      {media && <div className="mt-6">{media}</div>}

      <h1 className="mt-5 text-2xl font-semibold leading-8 text-content-primary">{title}</h1>
      {subtitle && (
        <p className={cn('mt-2 text-base text-content-secondary', centered && 'max-w-sm')}>{subtitle}</p>
      )}

      {children && <div className={cn('mt-6', centered && 'w-full')}>{children}</div>}
    </div>
  )
}
