import type { Milestone, PaymentPreset } from './create/paymentRules'

/** Lifecycle of an RFQ. `draft` → `open`(live, published straight to suppliers) → `awarded`/`closed`. */
export type RfqStatus = 'draft' | 'open' | 'awarded' | 'closed'

/** Row shape for the RFQ list read-model. */
export interface Rfq {
  id: string
  title: string
  status: RfqStatus
  createdAt: string
}

/** What the buyer is sourcing — drives whether Scope & deliverables is shown. */
export type SourcingType = 'goods' | 'service' | 'both'

/** How line items are entered on step 1. */
export type LineInputMethod = 'manual' | 'excel' | 'link'

export interface LineItem {
  id: string
  name: string
  specification: string
  quantity: number
  unit: string
}

export interface Deliverable {
  id: string
  text: string
}

/** A saved delivery address the buyer can ship to. */
export interface RfqAddress {
  id: string
  label: string
}

/**
 * The full RFQ draft — the single source of truth the 4-step wizard reads and patches, and
 * the payload persisted on Save/Submit. Money fields are SAR major units; conversion to exact
 * halalas happens at the calculation boundary (see `shared/lib/money`).
 */
export interface RfqDraft {
  id: string
  reference: string
  status: RfqStatus
  /** Number of supplier bids received (0 until a live RFQ attracts bids). */
  bids: number
  /** Set once a bid is awarded — the winning terms + generated PO. */
  award?: RfqAward

  // Step 1 — Requirement
  sourcing: SourcingType
  category: string
  title: string
  /** Estimated budget in SAR; `0` means none entered (the field is optional). */
  budget: number
  lineInputMethod: LineInputMethod
  lineItems: LineItem[]
  // Scope & deliverables (service / both only)
  scopeOfWork: string
  deliverables: Deliverable[]
  timeline: string

  // Step 2 — Delivery & terms
  deliverToCompanyAddress: boolean
  /** The chosen delivery address label (defaults to the company/registration address). */
  deliveryAddress: string
  requiredDeliveryDate: string
  closingDate: string
  partialDeliveryAllowed: boolean
  paymentPreset: PaymentPreset
  milestones: Milestone[]

  // Step 3 — Suppliers
  acceptanceCriteria: string
  specDocumentName: string
  certifications: string[]
  minimumWarranty: string
  ndaRequired: boolean
  regions: string[]
  favouritesOnly: boolean

  createdAt: string
  updatedAt: string
}

/** A supplier's bid on an RFQ (mock — identities stay masked until award). */
export type BidStatus = 'submitted' | 'negotiating'

/** The real supplier behind a masked bid — revealed only at award. */
export interface SupplierIdentity {
  companyName: string
  cr: string
  vat: string
  address: string
  contactName: string
  contactRole: string
  certifications: string[]
}

export interface Bid {
  id: string
  /** Masked label while the RFQ is blind, e.g. "Supplier A". */
  bidder: string
  status: BidStatus
  /** AI match score against the RFQ (0–100). */
  matchPct: number
  /** Bid total in SAR major units, VAT-inclusive. */
  totalSar: number
  itemsCovered: number
  itemsTotal: number
  /** Per requested line item; `null` = the bidder is not supplying that item. */
  unitPrices: (number | null)[]
  deliveryDate: string
  leadTimeDays: number
  /** Whether the bidder accepted the RFQ terms or countered, plus the percentages. */
  paymentTerms: { kind: 'accepted' | 'counter'; label: string }
  validUntil: string
  /** Required cert name → whether the bidder provided it. */
  compliance: Record<string, boolean>
  negotiationRounds: number
  identity: SupplierIdentity
}

/** The confirmed award on an RFQ — the winning bid's terms + the generated PO. */
export interface RfqAward {
  bidId: string
  supplierLabel: string
  identity: SupplierIdentity
  agreedTotalSar: number
  itemsCovered: number
  itemsTotal: number
  /** Requested line-item names not covered by the winning bid. */
  unsourcedItems: string[]
  deliveryDate: string
  paymentTermsLabel: string
  negotiationRounds: number
  savedVsOriginalSar: number
  offerVersion: number
  poNumber: string
  overrideReason?: string
  awardedAt: string
}

/** The four terminal outcomes after leaving the wizard (each renders a result card). */
export type RfqOutcome = 'draft_saved' | 'published' | 'verify_to_publish'

/** The result-card summary shown on any terminal outcome. */
export interface RfqResult {
  outcome: RfqOutcome
  reference: string
  status: RfqStatus
  category: string
  closingDate: string
  matchedSuppliers: number
}
