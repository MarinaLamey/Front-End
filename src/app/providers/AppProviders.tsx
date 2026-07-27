import { useEffect, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/platform/query/queryClient'
import { useTenant, useBrandingStore } from '@/platform/tenancy'
import { useSagaBridge } from '@/platform/commands'
import { VERIFICATION_STORAGE_KEY } from '@/platform/api/verification'

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
 * Keeps this tab's verification data in step with other tabs. The mock API writes decisions to
 * localStorage; the `storage` event fires in OTHER tabs, so when the admin approves/rejects in one
 * tab, the buyer tab refetches and re-renders — no manual refresh. (Same-tab updates already arrive
 * via the mutation's `setQueryData`.) When the real BFF exists this becomes a socket subscription.
 */
function VerificationSync({ children }: { children: ReactNode }) {
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === VERIFICATION_STORAGE_KEY) {
        void queryClient.invalidateQueries({ queryKey: ['verification'] })
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])
  return <>{children}</>
}

/**
 * Composition root for cross-cutting concerns. Auth, tenant, verification and branding are now
 * Zustand stores (no providers), so the only wrapper left is the server-cache; the branding
 * bootstrap, saga bridge and cross-tab verification sync run their effects beneath it.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantBranding>
        <VerificationSync>
          <SagaBridge>{children}</SagaBridge>
        </VerificationSync>
      </TenantBranding>
    </QueryClientProvider>
  )
}
