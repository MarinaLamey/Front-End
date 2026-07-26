import { create } from 'zustand'

export interface Tenant {
  id: string
  name: string
  flags: Record<string, boolean>
}

interface TenantState {
  tenant: Tenant
  isFlagEnabled: (flag: string) => boolean
  /** Update tenant fields — e.g. set the org name from the registration wizard. */
  setTenant: (patch: Partial<Tenant>) => void
}

/**
 * useTenant — the active tenant store (Zustand; no provider). In production the tenant derives
 * from the host/subdomain pre-auth then reconciles with the JWT claim; here it starts on the
 * platform brand and is filled in with the real org name once the user registers/logs in.
 * Branding is loaded separately (see AppProviders) keyed off `tenant.id`.
 */
export const useTenant = create<TenantState>((set, get) => ({
  tenant: {
    id: 'tenant_demo',
    name: 'MI-Proc',
    flags: { 'rfq.create': true, 'procurement.enabled': true },
  },
  isFlagEnabled: (flag) => get().tenant.flags[flag] ?? false,
  setTenant: (patch) => set((state) => ({ tenant: { ...state.tenant, ...patch } })),
}))
