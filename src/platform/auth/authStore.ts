import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { ROLES, type Portal, type Role } from './roles'

export interface AuthUser {
  id: string
  /** The signed-in person's name — captured at registration, or from the API on login. */
  name: string
  email: string
  portal: Portal
  roles: Role[]
  tenantId: string
  /** The portals this account can access — the buyer/supplier role(s) chosen at registration. */
  memberships: Portal[]
}

/** What we know about the user when they authenticate (dynamic — never hard-coded). */
export interface AuthProfile {
  name?: string
  email?: string
}

interface AuthState {
  user: AuthUser | null
  isAuthenticated: boolean
  /** True once the persisted session has been read back from storage — guards wait for this. */
  hasHydrated: boolean
  /**
   * Sign in to a portal, carrying whatever profile we have (name/email from register or the API).
   * `memberships` is the set of portals the account can access (defaults to just `portal`) — it
   * drives the Buyer/Supplier switch so a user only reaches the role(s) they registered for.
   */
  login: (portal: Portal, profile?: AuthProfile, memberships?: Portal[]) => void
  logout: () => void
  hasRole: (role: Role) => boolean
  setHasHydrated: (value: boolean) => void
}

/**
 * useAuth — the session store (Zustand, matching brandingStore/verificationStore: no provider,
 * selector reads). Holds the current user and RBAC roles. `login` takes the real profile
 * (name/email) rather than seeding a fake user, so the shell shows who's actually signed in.
 * Swap `login` for OIDC/token acquisition against Keycloak/Nafath when the BFF exists.
 */
export const useAuth = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      hasHydrated: false,
      login: (portal, profile, memberships) =>
        set({
          user: {
            id: 'u_current',
            name: profile?.name ?? '',
            email: profile?.email ?? '',
            portal,
            roles: [...ROLES[portal]] as Role[],
            tenantId: 'tenant_current',
            memberships: memberships && memberships.length > 0 ? memberships : [portal],
          },
          isAuthenticated: true,
        }),
      logout: () => set({ user: null, isAuthenticated: false }),
      hasRole: (role) => get().user?.roles.includes(role) ?? false,
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      // Persist the session so a refresh doesn't drop the user onto the login page. Uses
      // sessionStorage (per-TAB), NOT localStorage, so a buyer tab and an admin tab keep their
      // OWN session across reloads instead of clobbering a shared key. Only the serialisable slice
      // is stored — the action functions are recreated from the store.
      name: 'miproc.auth.v1',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
      // Flip `hasHydrated` once the stored session is read back, so route guards don't redirect
      // (e.g. reloading /admin) before the persisted role is available.
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)
