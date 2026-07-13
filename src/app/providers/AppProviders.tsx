import { type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from '@/platform/query/queryClient'
import { AuthProvider } from '@/platform/auth'
import { TenantProvider } from '@/platform/tenancy'
import { useSagaBridge } from '@/platform/commands'

/** Subscribes the saga tracker to socket domain events (the reconcile step). */
function SagaBridge({ children }: { children: ReactNode }) {
  useSagaBridge()
  return <>{children}</>
}

/**
 * Composition root for cross-cutting providers. Order: server-cache → tenant (resolves
 * identity + branding) → auth → saga bridge. Tenancy sits above auth so branding is in
 * flight before the first authenticated screen renders.
 */
export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <TenantProvider>
        <AuthProvider>
          <SagaBridge>{children}</SagaBridge>
        </AuthProvider>
      </TenantProvider>
    </QueryClientProvider>
  )
}
