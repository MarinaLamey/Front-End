import { type ReactNode } from 'react'
import { cn } from '@/shared/lib/cn'
import { useReveal, type RevealFrom } from './useReveal'

export interface RevealProps {
  children: ReactNode
  /** Stagger in ms, applied as a transition delay. */
  delay?: number
  /** Entrance direction / style. All are transform + opacity only. */
  from?: RevealFrom
  className?: string
}

/**
 * Reveal — presentational shell over {@link useReveal}. The hook owns the
 * IntersectionObserver, the reduced-motion check and the state→class mapping; this file
 * only renders the wrapper and merges in the caller's className.
 */
export function Reveal({ children, delay = 0, from = 'up', className }: RevealProps) {
  const { ref, style, motionClassName } = useReveal({ delay, from })

  return (
    <div ref={ref} style={style} className={cn(motionClassName, className)}>
      {children}
    </div>
  )
}
