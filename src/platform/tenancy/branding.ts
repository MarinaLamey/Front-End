/**
 * Server-driven branding (§10.3) + the no-FOUC theme contract.
 *
 * The palette is applied to CSS custom properties on :root, so every design-system
 * primitive reskins at runtime — token names match the `@theme` layer in index.css
 * (e.g. 'brand-primary' → `--brand-primary`).
 *
 * This module is the SINGLE SOURCE OF TRUTH for the storage key, the token/value
 * grammar, and the apply logic. The inline <head> script in index.html is a
 * deliberate, minimal mirror of `sanitizePalette` + apply (it can't import, since it
 * runs before the bundle is parsed) — keep the two in sync if either changes.
 */
export interface BrandingPayload {
  tenantId: string
  /** Versioned via the ConfigVersioned stream; used for stale-while-revalidate. */
  version: number
  palette: Record<string, string>
  logoUri?: string
  copy?: Record<string, string>
}

export const BRANDING_STORAGE_KEY = 'miproc.branding'

// Token names: lowercase design tokens only. Values: a conservative color grammar.
// Anything outside these is dropped — localStorage is attacker-writable (XSS), so we
// never feed arbitrary strings into setProperty.
const TOKEN_NAME = /^[a-z0-9-]+$/
const SAFE_COLOR = /^#[0-9a-f]{3,8}$|^(?:rgb|rgba|hsl|hsla)\([0-9.,%\s/]+\)$/i
//spliting the pallate key and value comes from json 
export function sanitizePalette(palette: Record<string, unknown>): Record<string, string> {
  const safe: Record<string, string> = {}
  for (const [token, value] of Object.entries(palette)) {
    if (typeof value === 'string' && TOKEN_NAME.test(token) && SAFE_COLOR.test(value)) {
      safe[token] = value
    }
  }
  return safe
}

export function applyPalette(
  palette: Record<string, string>,
  target: HTMLElement = document.documentElement,
): void {
  for (const [token, value] of Object.entries(palette)) {
    target.style.setProperty(`--${token}`, value)
  }
}

/** Read the cached payload the inline script also used — keeps React aligned, no flash. */
export function readCachedBranding(): BrandingPayload | null {
  try {
    const raw = localStorage.getItem(BRANDING_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as BrandingPayload
    return parsed?.palette ? parsed : null
  } catch {
    return null // disabled/corrupt storage → behave as a cold cache
  }
}

export function persistBranding(payload: BrandingPayload): void {
  try {
    localStorage.setItem(BRANDING_STORAGE_KEY, JSON.stringify(payload))
  } catch {
    /* quota/unavailable — ignore; the DOM is already themed for this session */
  }
}
