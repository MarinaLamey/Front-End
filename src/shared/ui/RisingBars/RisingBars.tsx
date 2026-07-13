import { cn } from '@/shared/lib/cn'

export interface RisingBarsProps {
  /** Keep the bars raised (e.g. the active item). Otherwise they rise on the parent group's hover. */
  active?: boolean
}

/**
 * Decorative hover fill: three brand bars that rise from the baseline to flood the
 * container, staggered so they appear to "stack up". Uses scaleY on the compositor
 * (transform-origin: bottom) rather than animating height — same look, but it stays at
 * 60fps and never triggers layout (Pillar 2). The color snaps; only transform animates.
 *
 * Drop it inside a `group` element that is `relative` + `overflow-hidden`, and keep the
 * label above it (e.g. a `relative z-10` wrapper). Decorative, so hidden from a11y.
 */
export function RisingBars({ active = false }: RisingBarsProps) {
  const bar =
    'h-full origin-bottom bg-brand-primary transition-transform ease-out motion-reduce:transition-none ' +
    (active ? 'scale-y-100' : 'scale-y-0 group-hover:scale-y-100')

  return (
    <span aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 flex overflow-hidden">
      <span className={cn(bar, 'w-1/3 duration-150')} />
      <span className={cn(bar, 'w-1/3 delay-75 duration-200')} />
      <span className={cn(bar, 'w-1/3 grow delay-100 duration-300')} />
    </span>
  )
}
