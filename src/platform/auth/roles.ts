/**
 * Portals and their RBAC roles (delivered in the JWT, §5.2/§10.1). Client-side
 * gating is UX only — the BFF re-authorizes every call regardless.
 */
export type Portal = 'buyer' | 'supplier' | 'back-office' | 'whitelabel'

export const ROLES = {
  buyer: ['Admin', 'Maker', 'Checker', 'Viewer'],
  supplier: ['Admin', 'Sales', 'Finance', 'Viewer'],
 'back-office': ['Compliance', 'Finance', 'Support', 'SuperAdmin'],
  whitelabel: ['Admin', 'Member'],
} as const satisfies Record<Portal, readonly string[]>

export type Role = (typeof ROLES)[Portal][number];

/**
 * The SEAT a person holds in their organisation — one per session, unlike {@link Role} which is the
 * set of permissions that seat implies. This is the vocabulary the Organisation → Users screen uses,
 * and it decides which profile someone sees and whether the Organisation section is theirs to open.
 */
export type Seat = 'orgAdmin' | 'buyer' | 'supplier' | 'viewer'

/**
 * Permissions a seat carries inside a portal. An Org Admin holds `Admin`; everyone else gets the
 * working roles for their portal and no admin rights — which is what makes the buyer and supplier
 * profiles (and the admin-only navigation) distinguishable at all.
 */
export function rolesForSeat(portal: Portal, seat: Seat): Role[] {
  if (portal === 'back-office' || portal === 'whitelabel') return [...ROLES[portal]] as Role[]
  if (seat === 'orgAdmin') return [...ROLES[portal]] as Role[]
  if (seat === 'viewer') return ['Viewer']
  return portal === 'supplier' ? ['Sales', 'Viewer'] : ['Maker', 'Checker', 'Viewer']
}

/**
 * The seat to assume when a caller doesn't name one: an ordinary member of the organisation.
 *
 * Deliberately NOT `orgAdmin`. Admin rights are granted only by naming the seat explicitly, from the
 * one fact that establishes them — the backend's `Admin` role, held by whoever registered the
 * company. Defaulting to `orgAdmin` handed the Organisation section and the admin badge to EVERY
 * signed-in account, including the Buyer/Supplier users an admin provisions, who must never see them.
 */
export function defaultSeat(portal: Portal): Seat {
  return portal === 'supplier' ? 'supplier' : 'buyer'
}
