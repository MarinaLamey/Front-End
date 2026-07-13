import { useId } from 'react'
import { cn } from '@/shared/lib/cn'

export interface BrandLogoProps {
  /** White knockout variant, for dark/colored backgrounds. Defaults to the full-color mark. */
  variant?: 'color' | 'white'
  /** Accessible name. Defaults to the product name; pass '' for a decorative mark. */
  alt?: string
  className?: string
}

// Rounded, heavy font stack that best approximates the mimony wordmark across platforms.
const FONT = "'Trebuchet MS', 'Segoe UI', system-ui, -apple-system, sans-serif"

/**
 * BrandLogo — the mimony wordmark, drawn as a self-contained inline SVG (teal "mi" block +
 * purple "mony" + gradient underline). No image asset, so it stays crisp at any size and
 * needs no file. NOTE: the letterforms approximate the brand typeface; drop the official
 * vector here to make it exact. Single source of truth — swapping touches one place.
 *
 * Sizing is the caller's job via `className` (e.g. `h-8 w-auto`); the viewBox sets the ratio.
 */
export function BrandLogo({ variant = 'color', alt = 'mimony', className }: BrandLogoProps) {
  const gradientId = `mimony-underline-${useId().replace(/:/g, '')}`
  const mono = variant === 'white'

  const boxFill = mono ? 'none' : '#0DB39E'
  const monyFill = mono ? '#ffffff' : '#473F8B'

  return (
    <svg
      viewBox="0 0 240 64"
      className={cn('block', className)}
      role={alt ? 'img' : undefined}
      aria-label={alt || undefined}
      aria-hidden={alt ? undefined : true}
    >
      <defs>
        <linearGradient id={gradientId} x1="118" y1="0" x2="206" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#0DB39E" />
          <stop offset="55%" stopColor="#3B5BC9" />
          <stop offset="100%" stopColor="#473F8B" />
        </linearGradient>
      </defs>

      {/* teal "mi" block */}
      <rect x="1" y="12" width="110" height="50" rx="4" fill={boxFill} stroke={mono ? '#ffffff' : 'none'} strokeWidth="2" />
      <text
        x="55"
        y="50"
        textAnchor="middle"
        fontFamily={FONT}
        fontSize="46"
        fontStyle="italic"
        fontWeight="800"
        letterSpacing="-1"
        fill="#ffffff"
      >
        mi
      </text>

      {/* purple "mony" */}
      <text x="118" y="50" fontFamily={FONT} fontSize="46" fontWeight="800" letterSpacing="-1" fill={monyFill}>
        mony
      </text>

      {/* gradient underline (slanted right end) */}
      <polygon points="118,54 206,54 201,60 118,60" fill={mono ? '#ffffff' : `url(#${gradientId})`} />
    </svg>
  )
}
