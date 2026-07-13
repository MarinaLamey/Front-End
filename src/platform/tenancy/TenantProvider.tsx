import { createContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useBrandingStore } from './brandingStore'

export interface Tenant {
  id: string
  name: string
  flags: Record<string, boolean>
}

export interface TenantContextValue {
  tenant: Tenant
  isFlagEnabled: (flag: string) => boolean
}

export const TenantContext = createContext<TenantContextValue | null>(null)

/**
 * Resolve the active tenant. In production this derives from the host/subdomain
 * (e.g. acme.miproc.sa → 'acme') pre-auth, then reconciles with the JWT tenant claim.
 * Mocked to a single demo tenant for now.
 */
function resolveTenant(): Tenant {
  return {
    id: 'tenant_demo',
    name: 'Demo Tenant',
    flags: { 'rfq.create': true, 'procurement.enabled': true },
  }
}

/**
 * Owns the tenancy lifecycle: identity + the branding handshake. The inline <head>
 * script has already painted from cache; here we revalidate this tenant's branding
 * (version-gated, so an unchanged theme never repaints) — completing the SWR loop.
 */
export function TenantProvider({ children }: { children: ReactNode }) {
  const [tenant] = useState<Tenant>(resolveTenant)
  const loadBranding = useBrandingStore((state) => state.loadBranding)

  useEffect(() => {
    void loadBranding(tenant.id)
  }, [tenant.id, loadBranding])
  
  const value = useMemo<TenantContextValue>(
    () => ({
      tenant,
      isFlagEnabled: (flag) => tenant.flags[flag] ?? false,
    }),
    [tenant],
  )
//this fun flags user features 
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>
}
