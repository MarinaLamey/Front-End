import { type CSSProperties } from 'react'
import { useMotionTier } from './useMotionTier'
import { useScrollLink } from './useScrollLink'
import './landingMotion.css'

/**
 * The trace's shape: (x, t) waypoints joined by straight segments — precise right-angle-ish
 * jogs, like a circuit trace or a flowchart connector, not an organic curve. This is the piece
 * that makes it read as financial/technical infrastructure rather than decorative flourish.
 * `t` is a SPATIAL parameter (0 = top of the wrapper, 1 = bottom) — independent of scroll
 * progress, which only controls how much of this fixed shape is drawn.
 */
const WAYPOINTS: Array<[x: number, t: number]> = [
  [50, 0],
  [50, 0.08],
  [72, 0.18],
  [72, 0.28],
  [30, 0.38],
  [30, 0.48],
  [68, 0.58],
  [68, 0.68],
  [50, 0.8],
  [50, 1],
]

/** Linear interpolation along `WAYPOINTS` — nodes sample this SAME function for their (x, t), so
 * they are mathematically guaranteed to sit on the line, not merely near it. */
function pointAt(t: number): [number, number] {
  const clamped = Math.min(1, Math.max(0, t))
  for (let i = 0; i < WAYPOINTS.length - 1; i++) {
    const [x0, t0] = WAYPOINTS[i]
    const [x1, t1] = WAYPOINTS[i + 1]
    if (clamped >= t0 && clamped <= t1) {
      const local = t1 === t0 ? 0 : (clamped - t0) / (t1 - t0)
      return [x0 + (x1 - x0) * local, 100 * clamped]
    }
  }
  const [x] = WAYPOINTS[WAYPOINTS.length - 1]
  return [x, 100 * clamped]
}

// Built once at module scope (this shape never changes) — a straight-segment polyline needs no
// smoothing pass; each waypoint IS a vertex.
const THREAD_D = WAYPOINTS.map(([x, t], i) => `${i === 0 ? 'M' : 'L'} ${x} ${(100 * t).toFixed(2)}`).join(' ')

// Checkpoint markers sit at each jog's "hold" segment — spatial position (matches WAYPOINTS'
// space) paired with WHEN, during the scroll-linked draw, that checkpoint should light up.
const NODES: Array<{ spatialT: number; lightAt: number }> = [
  { spatialT: 0.23, lightAt: 0.1 },
  { spatialT: 0.43, lightAt: 0.3 },
  { spatialT: 0.63, lightAt: 0.48 },
  { spatialT: 0.9, lightAt: 0.64 },
]

/**
 * ThreadPath — the connecting line from the hero's process cards down into Features, drawn via
 * `stroke-dashoffset` as the user scrolls (native `animation-timeline: view()` where supported;
 * a `--progress` custom property from `scrollEngine.ts` otherwise). A precise, angular trace —
 * not traced to each card's literal DOM position (the 2×2 grid reflows across breakpoints/RTL/
 * content length, and a path hand-fitted to today's layout would be one responsive change away
 * from pointing at nothing) — with four checkpoint markers lighting up in sequence, echoing the
 * four-step process (RFQ → match → verify → settle) abstractly rather than literally.
 *
 * Purely decorative (`aria-hidden`, `pointer-events-none`), so on the `simple` motion tier it
 * renders nothing at all — no loss of content, only the overlay is skipped.
 */
export function ThreadPath() {
  const tier = useMotionTier()
  const ref = useScrollLink<HTMLDivElement>({ start: 0, end: 0.7 })

  if (tier === 'simple') return null

  return (
    <div ref={ref} className="absolute inset-0" aria-hidden="true">
      <svg className="thread-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
        <defs>
          {/* Fixed white top stop (over the hero's always-purple gradient) to the theme-aware
              brand token (over Features' `bg-bg-canvas`) — two stops, not a soft multi-stop wash,
              for a crisper, more deliberate line than a decorative glow. */}
          <linearGradient id="thread-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.75" />
            <stop offset="100%" stopColor="var(--color-brand-primary)" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        <path className="thread-path" pathLength={1} style={{ strokeDasharray: 1 } as CSSProperties} d={THREAD_D} />
      </svg>

      {/* Plain HTML, positioned at the exact (x%, y%) `pointAt` sampled — see landingMotion.css
          for why these aren't SVG `<circle>`s. */}
      {NODES.map(({ spatialT, lightAt }, i) => {
        const [x, y] = pointAt(spatialT)
        return (
          <span
            key={i}
            className={`thread-node thread-node-${i}`}
            style={{ '--node-at': lightAt, '--node-x': `${x}%`, '--node-y': `${y}%` } as CSSProperties}
          />
        )
      })}
    </div>
  )
}
