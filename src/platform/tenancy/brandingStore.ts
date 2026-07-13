import { create } from 'zustand'
import { bff } from '@/platform/bff'
import { getConfig } from '@/platform/config'
import {
  applyPalette,
  persistBranding,
  readCachedBranding,
  sanitizePalette,
  type BrandingPayload,
} from './branding'

/**
 * Mock branding for local dev (useMocks). Mirrors the default tokens so the round-trip
 * is visually neutral while it exercises fetch → apply → persist → version-gate, and
 * seeds localStorage so the inline <head> script can paint it pre-paint next load.
 */
async function fetchMockBranding(tenantId: string): Promise<BrandingPayload> {
  await new Promise((resolve) => setTimeout(resolve, 150))
  // v2: repaint to the mimony palette (purple primary / teal secondary). The bump forces
  // clients holding the old v1 teal cache past the version gate so they actually re-apply.
  return {
    tenantId,
    version: 2,
    palette: {
      'brand-primary': '#51489e',
      'brand-primary-hover': '#473f8b',
      'brand-secondary': '#00ab98',
    },
    copy: { appName: 'MI-Proc' },
  }
}

interface BrandingState {
  branding: BrandingPayload | null
  isLoading: boolean
  /** Apply + persist a payload (after a fresh fetch or a runtime ConfigVersioned event). */
  setBranding: (payload: BrandingPayload) => void
  /** Fetch the latest branding for a tenant and reconcile DOM + state + cache. */
  loadBranding: (tenantId: string) => Promise<void>
}

/**
 * The React-side half of the handshake. It boots ALIGNED with what the inline <head>
 * script already painted (same cache, same key) — it does not re-apply on init, so
 * there is no second flash. Fresh branding only touches the DOM when the version
 * actually changes.
 */
export const useBrandingStore = create<BrandingState>((set, get) => ({
  branding: readCachedBranding(),
  isLoading: false,

  setBranding: (payload) => {
    // Sanitize before it reaches the DOM or storage — never trust the wire blindly.
    const safe: BrandingPayload = { ...payload, palette: sanitizePalette(payload.palette) }
    applyPalette(safe.palette)
    persistBranding(safe)
    set({ branding: safe })
  },

  loadBranding: async (tenantId) => {
    set({ isLoading: true })
    try {
      const fresh = getConfig().useMocks
        ? await fetchMockBranding(tenantId)
        : await bff.get<BrandingPayload>(`/tenants/${tenantId}/branding`)
      const current = get().branding
      // Version-gated: skip the repaint when nothing changed (stale-while-revalidate).
      if (current?.tenantId !== fresh.tenantId || current.version !== fresh.version) {
        get().setBranding(fresh)
      }
    } catch {
      // Keep the cached theme; never blank the UI on a failed refresh.
    } finally {
      set({ isLoading: false })
    }
  },
}))
