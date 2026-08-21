import { useEffect, useRef } from 'react'
import { resolveMotionTier } from './motionTier'

let nativeSupport: boolean | null = null

/** `animation-timeline: view()` support, checked once and cached — never re-evaluated per element. */
function supportsScrollTimeline(): boolean {
  if (nativeSupport === null) {
    nativeSupport = typeof CSS !== 'undefined' && CSS.supports('animation-timeline', 'view()')
  }
  return nativeSupport
}

export interface UseScrollLinkOptions {
  start?: number
  end?: number
}

/**
 * useScrollLink — opts an element into scroll-linked `--progress`, but ONLY when it's actually
 * needed. Three ways this hook does nothing at all:
 *  1. The browser supports `animation-timeline: view()` — the matching CSS (gated by the same
 *     `@supports` check) drives the motion natively, off the main thread. `scrollEngine.ts` is
 *     never even requested, so its bytes never reach the browser.
 *  2. `prefers-reduced-motion` or a low-end-device heuristic resolved to the `simple` tier — the
 *     CSS's `.motion-simple` branch (a plain, designed alternative) applies instead.
 *  3. (implicitly) the element isn't on screen — `scrollEngine`'s own IntersectionObserver skips
 *     it entirely; this hook only registers/unregisters, it never computes anything itself.
 * Only case 4 — an older browser, full tier — actually pays for the dynamically-imported engine.
 */
export function useScrollLink<T extends HTMLElement>(opts: UseScrollLinkOptions = {}) {
  const ref = useRef<T>(null)
  const { start, end } = opts

  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (supportsScrollTimeline()) return
    if (resolveMotionTier() === 'simple') return

    let cleanup: (() => void) | undefined
    let cancelled = false
    import('./scrollEngine').then(({ link }) => {
      if (cancelled || !ref.current) return
      cleanup = link(ref.current, { start, end })
    })

    return () => {
      cancelled = true
      cleanup?.()
    }
  }, [start, end])

  return ref
}
