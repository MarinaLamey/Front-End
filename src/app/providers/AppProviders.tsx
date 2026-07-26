import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/platform/query/queryClient'
import { useTenant, useBrandingStore } from '@/platform/tenancy'
import { useSagaBridge } from '@/platform/commands'

/** Subscribes the saga tracker to socket domain events (the reconcile step). */
function SagaBridge({ children }: { children: ReactNode }) {
  useSagaBridge()
  return <>{children}</>
}

/**
 * Loads the active tenant's branding once (and again if the tenant id changes). This used to
 * live in TenantProvider; now that tenancy is a store, the branding side-effect gets its own
 * small bootstrap so the store stays a pure data source.
 */
function TenantBranding({ children }: { children: ReactNode }) {
  const tenantId = useTenant((state) => state.tenant.id)
  const loadBranding = useBrandingStore((state) => state.loadBranding)
  useEffect(() => {
    void loadBranding(tenantId)
  }, [tenantId, loadBranding])
  return <>{children}</>
}

/**
 * Composition root for cross-cutting concerns. Auth, tenant, verification and branding are now
 * Zustand stores (no providers), so the only wrapper left is the server-cache; the branding
 * bootstrap and saga bridge run their effects beneath it.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantBranding>
        <SagaBridge>{children}</SagaBridge>
      </TenantBranding>
    </QueryClientProvider>
  )
}
