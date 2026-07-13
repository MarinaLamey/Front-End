import { useEffect, useRef, useState, type CSSProperties, type Ref } from 'react'
import { cn } from '@/shared/lib/cn'

export type RevealFrom = 'up' | 'down' | 'left' | 'right' | 'scale'

const HIDDEN: Record<RevealFrom, string> = {
  up: 'translate-y-10 opacity-0',
  down: '-translate-y-6 opacity-0',
  left: '-translate-x-8 opacity-0',
  right: 'translate-x-8 opacity-0',
  scale: 'scale-95 opacity-0',
}

export interface UseRevealOptions {
  /** Stagger in ms, applied as a transition delay. */
  delay?: number
  /** Entrance direction / style. All are transform + opacity only. */
  from?: RevealFrom
}

/** Everything the presentational shell needs — already computed. No JSX in here. */
export interface UseRevealResult {
  ref: Ref<HTMLDivElement>
  style?: CSSProperties
  /** Base motion classes + the current visible/hidden state (caller appends its own). */
  motionClassName: string
}

/**
 * useReveal — the "fade + move into view on first intersection" behavior, with no markup.
 *
 * RAIL-friendly by construction: it animates ONLY transform & opacity (compositor), uses
 * an IntersectionObserver (no scroll listeners → no layout thrashing) and disconnects
 * after revealing. Under prefers-reduced-motion it reports visible immediately, no movement.
 */
export function useReveal({ delay = 0, from = 'up' }: UseRevealOptions): UseRevealResult {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisible(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setVisible(true)
            observer.disconnect()
          }
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -10% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return {
    ref,
    style: delay ? { transitionDelay: `${delay}ms` } : undefined,
    motionClassName: cn(
      'transition-[opacity,transform] duration-1000 ease-out will-change-[opacity,transform]',
      'motion-reduce:transition-none',
      visible ? 'translate-x-0 translate-y-0 scale-100 opacity-100' : HIDDEN[from],
    ),
  }
}
