/**
 * motionTier — resolves the landing page's motion down to two tiers: `full` (the scroll-scrubbed,
 * kinetic vocabulary) or `simple` (a genuinely designed, reduced alternative — never "nothing").
 *
 * `simple` is forced by either signal a mid/low-end device would trip: the OS-level
 * prefers-reduced-motion preference, OR a device-capability heuristic (memory / core count /
 * a constrained connection) that predicts the scroll-scrubbed motion wouldn't hold 60fps.
 * Checked once (these signals don't change mid-session on any device that matters here).
 */
export type MotionTier = 'full' | 'simple'

interface NavigatorWithHints extends Navigator {
  deviceMemory?: number
  connection?: { saveData?: boolean; effectiveType?: string }
}

export function resolveMotionTier(): MotionTier {
  if (typeof window === 'undefined') return 'simple'
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return 'simple'

  const nav = navigator as NavigatorWithHints
  // ≤4GB reported memory or ≤4 logical cores: the two most common "this is a budget phone"
  // signals Chrome/Android expose. Both are undefined on browsers that don't report them
  // (notably Safari) — absence is never treated as "low-end", only an explicit low value is.
  if (nav.deviceMemory !== undefined && nav.deviceMemory <= 4) return 'simple'
  if (nav.hardwareConcurrency !== undefined && nav.hardwareConcurrency <= 4) return 'simple'
  if (nav.connection?.saveData) return 'simple'
  if (nav.connection?.effectiveType && ['slow-2g', '2g', '3g'].includes(nav.connection.effectiveType)) {
    return 'simple'
  }
  return 'full'
}
