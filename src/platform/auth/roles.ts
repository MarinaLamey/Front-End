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
 * The seat to assume when a caller doesn't name one: Org Admin.
 *
 * Whoever signs up creates the organisation, so the FIRST account in an org is always its admin —
 * and the demo signs you in as exactly that person. Every other seat exists because an Org Admin
 * invited it, and an invite always carries an explicit role, so a non-admin seat is never a default.
 */
export function defaultSeat(_portal: Portal): Seat {
  return 'orgAdmin'
}
