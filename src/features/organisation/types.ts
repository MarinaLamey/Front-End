/* ────────────────────────────────────────────────────────────────────────────
 * Org-admin data seam types.
 *
 * Mock DISPLAY data for the Organisation area (Overview / Users / Profile /
 * Settings). The per-member role here ('Org Admin' | 'Buyer' | 'Supplier' |
 * 'Both') is org-membership display data — NOT the auth RBAC in
 * `platform/auth/roles.ts`, which stays as-is. Only Buyer / Supplier / Both are
 * assignable from the Role selects (see `components/roles.ts`).
 * ──────────────────────────────────────────────────────────────────────────── */

export type OrgMemberRole = 'Org Admin' | 'Buyer' | 'Supplier' | 'Both'
export type OrgMemberStatus = 'active' | 'invited' | 'disabled'

export interface OrgMember {
  id: string
  name: string
  email: string
  department: string
  role: OrgMemberRole
  status: OrgMemberStatus
  /** Human "last active" / invite-sent / removed note shown in the Users table. */
  lastActive: string
  /** Active-since date shown in the Manage-user modal. */
  activeSince?: string
}

/** A row in the org-level "Action required today" feed. */
export interface OrgActionItem {
  id: string
  kind: 'access' | 'renewal' | 'inactive'
  text: string
  actionLabel: string
  /** The most urgent item leads with a filled button; the rest are outline. */
  primary?: boolean
}

/**
 * A compliance document on the organisation record. `valid` / `expiring` carry a `validUntil`;
 * `pending` is a freshly uploaded file still in review and carries none.
 */
export type OrgDocStatus = 'valid' | 'expiring' | 'pending'

export interface OrgDocument {
  id: string
  /** Display name of the document type, e.g. "VAT certificate" — also the delete dialog's pill. */
  type: string
  /**
   * i18n key under `org.profile.docs.type` for the seeded documents, so their names localise.
   * Absent on user-added documents, whose `type` is free text the uploader typed.
   */
  typeKey?: string
  /**
   * What identifies this document to a human — the registry number (CR / VAT / National Address)
   * or, for a certificate, its scope ("Steel & rebar"). Shown under the title in compliance lists.
   */
  reference?: string
  fileName: string
  status: OrgDocStatus
  /** ISO expiry. Absent while `pending`. */
  validUntil?: string
  /** Whole days until `validUntil`; drives the "Expires in n days" line. */
  expiresInDays?: number
  uploadedAt: string
  /** Core registry documents (CR / VAT / National Address) that verification reads. */
  core?: boolean
}

/** The editable company record — every field is a text input on the profile page. */
export interface OrgProfile {
  legalName: string
  tradeName: string
  cr: string
  vat: string
  sector: string
  companySize: string
}

/** Saudi National Address, as registered. */
export interface OrgAddress {
  buildingNumber: string
  street: string
  secondaryNumber: string
  district: string
  city: string
  postalCode: string
}

/** Org-wide switches. `anonymousRfqs` is not here — it is always on and not togglable. */
export interface OrgSettings {
  notifyNewBid: boolean
  notifyCounterOffer: boolean
  notifyOrderStatus: boolean
  notifyDocExpiry: boolean
  requireCertifications: boolean
  allowPartialBids: boolean
}

export interface OrgPlan {
  /** Plan name, e.g. "Growth". */
  name: string
  /** ISO renewal date. */
  renewsAt: string
}

export interface OrganisationData {
  identity: {
    name: string
    /** e.g. "Buyer & Supplier" — the org's registered role(s). */
    type: string
    cr: string
    vat: string
    location: string
  }
  profile: OrgProfile
  address: OrgAddress
  documents: OrgDocument[]
  settings: OrgSettings
  plan: OrgPlan
  actions: OrgActionItem[]
  /** Seats: max 5/org per HLD. `used` = active + invited (an invite consumes a seat); disabled frees it. */
  seats: { total: number; used: number; left: number; active: number; invited: number; disabled: number }
  /** The "Organisation Bids" tile: total + the in-flight split shown as a subtitle. */
  bids: { total: number; bidding: number; negotiating: number }
  payment: { receivedMtd: string; receivable: string }
  /** The "Bid summary" card — org-wide pipeline counts. */
  bidSummary: { bidding: number; negotiating: number; won: number; lost: number }
  receivables: { received: string; pending: string; overdue: string }
  members: OrgMember[]
}

/** What the invite dialog collects. */
export interface InviteInput {
  name: string
  email: string
  /**
   * The new user's initial password, set by the Org Admin.
   *
   * Required because `POST /api/admin/users` creates the account outright — the backend has no
   * invitation flow, so there is no set-your-own-password link for the user to follow. It is passed
   * straight to that call and never persisted client-side (the mock builds its member row from named
   * fields, so it cannot leak into localStorage).
   */
  password: string
  role: OrgMemberRole
}
