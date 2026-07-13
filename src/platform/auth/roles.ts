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
