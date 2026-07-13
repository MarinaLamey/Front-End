import { createContext, useMemo, useState, type ReactNode } from 'react'
import { ROLES, type Portal, type Role } from './roles'

export interface AuthUser {
  id: string
  name: string
  portal: Portal
  roles: Role[]
  tenantId: string
}

export interface AuthContextValue {
  user: AuthUser | null
  isAuthenticated: boolean
  login: (portal: Portal) => void
  logout: () => void
  hasRole: (role: Role) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

/**
 * Mock auth provider. Swap for OIDC + PKCE against Keycloak/Nafath: token acquisition
 * (≤15 min), refresh with revocation, secure storage, and the step-up MFA gate all
 * slot in here without touching consumers.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: user != null,
      login: (portal) =>
        setUser({
          id: 'u_demo',
          name: 'Demo User',
          portal,
          roles: [...ROLES[portal]] as Role[],
          tenantId: 'tenant_demo',
        }),
      logout: () => setUser(null),
      hasRole: (role) => user?.roles.includes(role) ?? false,
    }),
    [user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
