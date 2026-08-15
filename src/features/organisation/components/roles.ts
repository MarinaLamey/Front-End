import type { OrgMemberRole } from '../types'

/** The four roles in the order the frames list them, and the order the Role selects offer. */
export const ROLE_ORDER = ['orgAdmin', 'buyer', 'supplier', 'viewer'] as const

const ROLE_BY_KEY: Record<(typeof ROLE_ORDER)[number], OrgMemberRole> = {
  orgAdmin: 'Org Admin',
  buyer: 'Buyer',
  supplier: 'Supplier',
  viewer: 'Viewer',
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
