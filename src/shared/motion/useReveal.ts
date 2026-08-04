import { useEffect, useRef, useState } from 'react'

interface RevealOptions {
  /** Fraction of the element visible before it reveals (IntersectionObserver threshold). */
  threshold?: number
  /** Reveal only once (default) or re-hide when it leaves and replay on re-entry. */
  once?: boolean
  /** Root margin — e.g. '0px 0px -10% 0px' to trigger a little before it enters. */
  rootMargin?: string
}

/**
 * useReveal — drives the `.mp-reveal` primitive: attach `ref` to the element (which
 * carries `className="mp-reveal"`) and bind `data-shown={shown}`. It reveals when the
 * element scrolls into view, and manages `will-change` around the transition so the
 * compositor layer is promoted only while animating and released afterwards.
 *
 * Respects prefers-reduced-motion (reveals immediately, no observer) and no-IO
 * environments (reveals immediately) so content is never stranded hidden.
 */
export function useReveal<T extends HTMLElement = HTMLDivElement>(options: RevealOptions = {}) {
  const { threshold = 0.15, once = true, rootMargin = '0px 0px -8% 0px' } = options
  const ref = useRef<T>(null)
  const [shown, setShown] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const prefersReduced =
      typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches
    if (prefersReduced || typeof IntersectionObserver === 'undefined') {
      setShown(true)
      return
    }

    // Promote a layer just before it animates; release it when the transition ends.
    const onEnd = () => {
      el.style.willChange = ''
    }
    el.addEventListener('transitionend', onEnd)

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.style.willChange = 'transform, opacity'
            setShown(true)
            if (once) observer.unobserve(el)
          } else if (!once) {
            setShown(false)
          }
        }
      },
      { threshold, rootMargin },
    )
    observer.observe(el)

    return () => {
      observer.disconnect()
      el.removeEventListener('transitionend', onEnd)
    }
  }, [threshold, once, rootMargin])

  return { ref, shown }
}
