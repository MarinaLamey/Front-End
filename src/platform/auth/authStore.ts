import { create } from 'zustand'
import { ROLES, type Portal, type Role } from './roles'

export interface AuthUser {
  id: string
  /** The signed-in person's name — captured at registration, or from the API on login. */
  name: string
  email: string
  portal: Portal
  roles: Role[]
  tenantId: string
}

/** What we know about the user when they authenticate (dynamic — never hard-coded). */
export interface AuthProfile {
  name?: string
  email?: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  /** Sign in to a portal, carrying whatever profile we have (name/email from register or the API). */
  login: (portal: Portal, profile?: AuthProfile) => void
  logout: () => void
  hasRole: (role: Role) => boolean
}

/**
 * useAuth — the session store (Zustand, matching brandingStore/verificationStore: no provider,
 * selector reads). Holds the current user and RBAC roles. `login` takes the real profile
 * (name/email) rather than seeding a fake user, so the shell shows who's actually signed in.
 * Swap `login` for OIDC/token acquisition against Keycloak/Nafath when the BFF exists.
 */
export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  isAuthenticated: false,
  login: (portal, profile) =>
    set({
      user: {
        id: 'u_current',
        name: profile?.name ?? '',
        email: profile?.email ?? '',
        portal,
        roles: [...ROLES[portal]] as Role[],
        tenantId: 'tenant_current',
      },
      isAuthenticated: true,
    }),
  logout: () => set({ user: null, isAuthenticated: false }),
  hasRole: (role) => get().user?.roles.includes(role) ?? false,
}))
