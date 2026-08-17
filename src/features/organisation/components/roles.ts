import type { OrgMemberRole } from '../types'

/** Every role a member can hold, in the order the frames list them. */
export const ROLE_ORDER = ['orgAdmin', 'buyer', 'supplier', 'both'] as const

export type RoleKey = (typeof ROLE_ORDER)[number]

/**
 * The roles an Org Admin can hand out from the Role selects. Org Admin still renders on the
 * members already holding it, but it is not something an invitation grants — a new user joins as
 * a Buyer, a Supplier, or both.
 */
export const ASSIGNABLE_ROLES: readonly RoleKey[] = ['buyer', 'supplier', 'both']

const ROLE_BY_KEY: Record<RoleKey, OrgMemberRole> = {
  orgAdmin: 'Org Admin',
  buyer: 'Buyer',
  supplier: 'Supplier',
  both: 'Both',
}

/**
 * Resolve a role from its translated label — `Select` reports the label the user picked, not a
 * value. Matching by translation keeps the control working in Arabic; an unmatched label falls
 * back to Buyer, the least-privileged role that can still do the job.
 */
export function roleFromLabel(label: string, t: (key: string) => string): OrgMemberRole {
  const key = ROLE_ORDER.find((k) => t(`org.users.roles.${k}.name`) === label)
  return key ? ROLE_BY_KEY[key] : 'Buyer'
}
