/**
 * scrollEngine — the ONE shared scroll-progress driver for the landing page's scroll-linked
 * motion. It only exists as a fallback: everywhere `animation-timeline: view()` is supported,
 * the browser drives the same motion natively and this module is never imported at all (see
 * `useScrollLink`). Where it IS needed, there is exactly one IntersectionObserver and one
 * rAF loop for the whole page — never one per component.
 *
 * Contract with the DOM: every scroll tick does ALL its `getBoundingClientRect()` reads first,
 * then ALL its writes (a single `--progress` custom property per registered element). Reads
 * never happen after a write in the same pass, so this can never cause layout thrashing.
 * The write only ever touches a custom property — never a layout-affecting one — so setting it
 * costs a style recalc, not a layout pass.
 */

interface LinkOptions {
  /**
   * Where, within the element's natural scroll-through span (0 = its top just entering the
   * viewport, 1 = its bottom having fully left it — correct for both a short and a very tall
   * element), output progress should read 0. Lets a caller narrow the window without a
   * different formula. Default 0.
   */
  start?: number
  /** Where in that same natural span output progress should read 1. Default 1. */
  end?: number
}

interface Entry {
  el: HTMLElement
  start: number
  end: number
}

const entries = new Map<HTMLElement, Entry>()
const active = new Set<HTMLElement>()

let io: IntersectionObserver | null = null
let ticking = false
let rafId = 0
let lastScrollAt = 0
let listenerAttached = false

function ensureObserver(): IntersectionObserver {
  if (io) return io
  // A generous rootMargin means an element becomes "active" a little before it's literally on
  // screen, so its very first frame of visible progress is already correct rather than snapping.
  io = new IntersectionObserver(
    (observed) => {
      for (const e of observed) {
        if (e.isIntersecting) active.add(e.target as HTMLElement)
        else active.delete(e.target as HTMLElement)
      }
    },
    { rootMargin: '15% 0px 15% 0px', threshold: 0 },
  )
  return io
}

function computeProgress(rect: DOMRect, e: Entry, viewportHeight: number): number {
  // Standard scroll-through-viewport fraction: 0 when the element's top edge is exactly at the
  // viewport's bottom edge (just entering), 1 when its bottom edge has exactly reached the
  // viewport's top edge (fully exited) — correct regardless of the element's own height.
  const total = rect.height + viewportHeight
  const raw = total > 0 ? (viewportHeight - rect.top) / total : 0
  const remapped = (raw - e.start) / (e.end - e.start || 1)
  return Math.min(1, Math.max(0, remapped))
}

function tick(): void {
  ticking = false
  if (active.size === 0) return

  const viewportHeight = window.innerHeight

  // READ phase — every rect, before touching the DOM.
  const snapshot: Array<[Entry, DOMRect]> = []
  for (const el of active) {
    const e = entries.get(el)
    if (e) snapshot.push([e, el.getBoundingClientRect()])
  }

  // WRITE phase — custom-property only, so this is a style recalc, never a layout pass.
  for (const [e, rect] of snapshot) {
    const progress = computeProgress(rect, e, viewportHeight)
    e.el.style.setProperty('--progress', progress.toFixed(4))
  }

  // Keep ticking briefly after the last scroll/resize so inertial/momentum scrolling settles
  // smoothly instead of freezing on whatever frame the last event happened to land on.
  if (performance.now() - lastScrollAt < 200) {
    rafId = requestAnimationFrame(tick)
  }
}

function onScrollOrResize(): void {
  lastScrollAt = performance.now()
  if (!ticking) {
    ticking = true
    rafId = requestAnimationFrame(tick)
  }
}

function ensureListener(): void {
  if (listenerAttached) return
  listenerAttached = true
  window.addEventListener('scroll', onScrollOrResize, { passive: true })
  window.addEventListener('resize', onScrollOrResize, { passive: true })
}

/**
 * Register an element to receive a live `--progress` (0→1) custom property as it crosses the
 * given viewport window. Returns an unregister function — call it on unmount.
 */
export function link(el: HTMLElement, opts: LinkOptions = {}): () => void {
  const entry: Entry = { el, start: opts.start ?? 0, end: opts.end ?? 1 }
  entries.set(el, entry)
  ensureObserver().observe(el)
  ensureListener()
  onScrollOrResize() // prime a first value rather than waiting for the next scroll event

  return () => {
    entries.delete(el)
    active.delete(el)
    io?.unobserve(el)
    if (entries.size === 0) {
      cancelAnimationFrame(rafId)
      ticking = false
    }
  }
}
