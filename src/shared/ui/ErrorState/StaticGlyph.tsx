/**
 * The still used wherever the animation cannot be: while its chunk loads, if that load fails, and
 * if the animation itself errors. A plain token-coloured glyph with no motion, so it has nothing
 * that can break — which matters, because this is the fallback for a component that only ever
 * renders when something already has.
 */
export function StaticGlyph() {
  return (
    <svg viewBox="0 0 48 48" fill="none" className="h-16 w-16 text-content-tertiary" aria-hidden="true">
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="3" strokeOpacity="0.35" />
      <path d="M24 14v13" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="24" cy="33.5" r="2.25" fill="currentColor" />
    </svg>
  )
}
