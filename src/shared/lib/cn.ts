export type ClassValue = string | number | null | false | undefined | ClassValue[]

/**
 * Minimal, dependency-free className joiner (clsx-style).
 *
 * NOTE: this does not de-duplicate conflicting Tailwind utilities. If a consumer
 * passes a `className` that conflicts with an internal one (e.g. both set padding),
 * CSS source order decides the winner, not attribute order. When that becomes a
 * real problem, upgrade this to `tailwind-merge` + `clsx` — the call sites won't change.
 */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = []
  const walk = (value: ClassValue) => {
    if (value === null || value === undefined || value === false || value === '') return
    if (Array.isArray(value)) {
      value.forEach(walk)
      return
    }
    out.push(String(value))
  }
  inputs.forEach(walk)
  return out.join(' ')
}
