/* ────────────────────────────────────────────────────────────────────────────
 * MOTION TOKENS (JS mirror) — the same durations/easings/distances defined as CSS
 * custom properties in index.css, exposed to JS for the Framer Motion layer (exits,
 * reorder, drag) added in later phases. CSS stays the source of truth for CSS-driven
 * motion; this keeps JS-driven motion on the exact same scale. Keep in sync with the
 * `@theme` MOTION SYSTEM block.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Durations in seconds (Framer expects seconds). Mirror of `--dur-*` (ms). */
export const duration = {
  instant: 0.08,
  fast: 0.12,
  quick: 0.16,
  base: 0.22,
  slow: 0.32,
  celebrate: 0.46,
} as const

/** Cubic-bezier control points. Mirror of `--ease-*`. */
export const ease = {
  standard: [0.16, 1, 0.3, 1],
  spring: [0.34, 1.56, 0.64, 1],
  move: [0.65, 0, 0.35, 1],
  exit: [0.4, 0, 1, 1],
} as const

/** Travel distances in px. Mirror of `--motion-*`. */
export const distance = {
  sm: 4,
  md: 8,
  lg: 16,
} as const

/** Enter/press scale. Mirror of `--mp-enter-scale` / `--mp-press-scale`. */
export const scale = {
  enter: 0.97,
  press: 0.97,
} as const

/** Per-item stagger step in seconds. Mirror of `--mp-stagger-step`. */
export const staggerStep = 0.04

export type EaseName = keyof typeof ease
export type DurationName = keyof typeof duration
