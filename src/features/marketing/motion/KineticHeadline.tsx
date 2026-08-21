import { useEffect, useRef, type CSSProperties } from 'react'
import { Reveal } from '@/shared/ui/Reveal'
import { useMotionTier } from './useMotionTier'
import './landingMotion.css'

interface KineticHeadlineProps {
  text: string
  className?: string
}

/**
 * KineticHeadline — the hero's `<h1>`, revealed word-by-word via `clip-path` (a "cut", not a
 * fade or a slide) instead of the app-wide `Reveal` fade-up. Splits on whitespace only, never
 * mid-word, so Arabic letter-joining is untouched — each word is one atomic clipped unit, with
 * a plain space as a genuine text-node sibling between them so line-wrapping behaves normally.
 *
 * On the `simple` motion tier (prefers-reduced-motion, or a low-end-device heuristic — see
 * {@link useMotionTier}) this renders through the existing {@link Reveal} primitive instead:
 * still animated, just the app's established, cheaper fade-up rather than the kinetic cut.
 */
export function KineticHeadline({ text, className }: KineticHeadlineProps) {
  const tier = useMotionTier()
  const ref = useRef<HTMLHeadingElement>(null)

  // `will-change` only for the lifetime of each word's own entrance animation — added on mount,
  // stripped the moment that word's `animationend` fires.
  useEffect(() => {
    if (tier === 'simple') return
    const el = ref.current
    if (!el) return
    const words = el.querySelectorAll<HTMLElement>('.kinetic-word')
    const onEnd = (event: Event) => {
      ;(event.target as HTMLElement).style.willChange = 'auto'
    }
    words.forEach((word) => {
      word.style.willChange = 'clip-path'
      word.addEventListener('animationend', onEnd, { once: true })
    })
    return () => words.forEach((word) => word.removeEventListener('animationend', onEnd))
  }, [tier, text])

  if (tier === 'simple') {
    return (
      <Reveal from="up">
        <h1 className={className}>{text}</h1>
      </Reveal>
    )
  }

  const words = text.split(' ')

  return (
    <h1 ref={ref} className={className}>
      {words.flatMap((word, i) => {
        const span = (
          <span key={i} className="kinetic-word" style={{ '--i': i } as CSSProperties}>
            {word}
          </span>
        )
        return i === 0 ? [span] : [' ', span]
      })}
    </h1>
  )
}
