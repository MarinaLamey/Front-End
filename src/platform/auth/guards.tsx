import { Navigate, useLocation } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from './useAuth'
import type { Role } from './roles'

/** Gate a route on authentication. Client-side only — the BFF re-authorizes too. */
export function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()
  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  return <>{children}</>
}

/** Gate a route on a specific role. UX affordance, not a security boundary. */
export function RequireRole({ role, children }: { role: Role; children: ReactNode }) {
  const { hasRole } = useAuth()
  if (!hasRole(role)) return <Navigate to="/forbidden" replace />
  return <>{children}</>
}
