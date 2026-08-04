/* Motion system — shared foundation. CSS primitives live in index.css (mp-* classes);
 * this module is the JS surface: token mirror for the Framer layer + the useReveal hook. */
export { duration, ease, distance, scale, staggerStep } from './tokens'
export type { EaseName, DurationName } from './tokens'
export { useReveal } from './useReveal'
