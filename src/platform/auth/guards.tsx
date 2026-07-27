import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './authStore'
import type { Role } from './roles'

/** Gate a route on authentication. Client-side only — the BFF re-authorizes too. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, hasHydrated } = useAuth()
  const location = useLocation()
  // Wait for the persisted session to load before deciding — otherwise a reload redirects to login.
  if (!hasHydrated) return null
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/** Gate a route on a specific role. UX affordance, not a security boundary. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { hasRole, hasHydrated } = useAuth()
  // Same as above — don't judge the role until the persisted session is back.
  if (!hasHydrated) return null
  if (!hasRole(role)) return <Navigate to="/forbidden" replace />
  return <>{children}</>
}
