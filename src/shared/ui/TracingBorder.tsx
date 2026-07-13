import { useId } from 'react'

interface TracingBorderProps {
  /** Corner radius in px, matched to the host element's rounding. */
  radius?: number
}

/**
 * Animated gradient arc that traces the host element's border (a refined loading /
 * selection affordance). The host must be `position: relative`. Size-independent via
 * pathLength; pauses to a static border under reduced motion (see `.mp-trace`).
 */
export function TracingBorder({ radius = 6 }: TracingBorderProps) {
  // Unique gradient id per instance (no `:` so it's safe inside url()).
  const gradientId = `mp-grad-${useId().replace(/:/g, '')}`

  return (
    <svg
      className="pointer-events-none absolute inset-0 h-full w-full overflow-visible"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--color-brand-primary)" />
          <stop offset="100%" stopColor="var(--color-brand-secondary)" />
        </linearGradient>
      </defs>
      <rect
        x="1"
        y="1"
        rx={radius}
        ry={radius}
        fill="none"
        stroke={`url(#${gradientId})`}
        strokeWidth="2"
        pathLength="100"
        className="mp-trace"
        style={{ width: 'calc(100% - 2px)', height: 'calc(100% - 2px)' }}
      />
    </svg>
  )
}
