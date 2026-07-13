import { Link } from 'react-router-dom'
import { cn } from '@/shared/lib/cn'

export interface MorphButtonProps {
  label: string
  /** Reveal text shown on hover as the button morphs (e.g. "Grow With Us"). */
  hoverLabel: string
  /** Colour scheme for the background it sits on. */
  tone?: 'onDark' | 'onLight'
  /** Internal route (renders a <Link>) — or use `href` for an anchor. */
  to?: string
  href?: string
  className?: string
}

/* The hero's signature CTA motion: corners expand to a pill, the fill/text swap, and the
   label cross-fades to a hover message + growth arrow. transform/colour only → 60fps. */
const BASE =
  'group relative inline-flex h-[50px] select-none items-center justify-center overflow-hidden ' +
  'rounded-lg px-7 text-sm font-medium transition-[border-radius,background-color,color] ' +
  'duration-500 ease-in-out hover:rounded-[25px] motion-reduce:transition-none'

const TONE = {
  onDark: 'bg-white text-brand-primary hover:bg-brand-primary hover:text-white',
  onLight: 'bg-brand-primary text-brand-primary-on hover:bg-brand-primary-hover',
} as const

/** Growth arrow (matches the marketing IconGrowth), inlined so this stays feature-agnostic. */
function GrowthArrow() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="h-4 w-4 translate-y-0.5 transition-transform duration-500 ease-in-out group-hover:translate-y-0 motion-reduce:transition-none"
    >
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  )
}

/**
 * MorphButton — the landing page's primary "Get started" CTA. One reusable component so
 * the hero, the final CTA, and the header all share the exact same morph animation;
 * `tone` adapts the palette to a dark (gradient) or light (header) background.
 */
export function MorphButton({ label, hoverLabel, tone = 'onDark', to, href, className }: MorphButtonProps) {
  const classes = cn(BASE, TONE[tone], className)

  const content = (
    <>
      <span className="transition-opacity duration-500 ease-in-out group-hover:opacity-0 motion-reduce:transition-none">
        {label}
      </span>
      <span
        aria-hidden="true"
        className="absolute inset-0 flex items-center justify-center gap-2 opacity-0 transition-opacity duration-500 ease-in-out group-hover:opacity-100 motion-reduce:transition-none"
      >
        {hoverLabel}
        <GrowthArrow />
      </span>
    </>
  )

  return to ? (
    <Link to={to} className={classes}>
      {content}
    </Link>
  ) : (
    <a href={href ?? '#'} className={classes}>
      {content}
    </a>
  )
}
