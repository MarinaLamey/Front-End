import { cn } from '@/shared/lib/cn'
import logoBadge from '@/assets/logo-badge.svg'

export interface BrandLogoProps {
  /** Accessible name. Defaults to the product name; pass '' for a decorative mark. */
  alt?: string
  className?: string
}

/**
 * BrandLogo — the official mimony "badge" logo exported from Figma (teal "mi" block + purple
 * "mony" + gradient underline, with a soft drop shadow baked in). Rendered as an <img> from a
 * single high-res asset, so it is pixel-accurate and lives in ONE place — swapping the mark
 * touches only `logo-badge.svg`.
 *
 * Intrinsic size 91×70 (the 75×54 mark plus its shadow margin). Size via `className` — a height
 * with `w-auto` preserves the ratio.
 */
export function BrandLogo({ alt = 'mimony', className }: BrandLogoProps) {
  return <img src={logoBadge} alt={alt} draggable={false} className={cn('block', className)} />
}
