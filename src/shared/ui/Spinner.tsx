import { cn } from '@/shared/lib/cn'

interface SpinnerProps {
  /** Dot diameter in px (default 9). */
  size?: number
  className?: string
  /** Accessible label (default "Loading"). */
  label?: string
}

/**
 * Spinner — three brand dots fading in sequence (a gentle left-to-right wave). Animates opacity +
 * scale ONLY, so it runs on the compositor (GPU) with zero per-frame layout/paint and no JS in the
 * loop — it never affects performance. Theme-aware via the brand token; respects reduced-motion.
 */
export function Spinner({ size = 9, className, label = 'Loading' }: SpinnerProps) {
  return (
    <span role="status" aria-label={label} className={cn('inline-flex items-center gap-1.5', className)}>
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="rounded-full bg-brand-primary motion-safe:animate-dot-pulse motion-reduce:opacity-70"
          style={{ width: size, height: size, animationDelay: `${i * 160}ms` }}
        />
      ))}
    </span>
  )
}
