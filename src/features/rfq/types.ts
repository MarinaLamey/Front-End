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
  /** Negotiation threads by bid id — only present once the buyer has opened/countered one. */
  negotiations?: Record<string, NegotiationThread>
  /** Free-text messages in the post-award order conversation. */
  orderMessages?: OrderMessage[]

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

/** One offer version in a negotiation thread — an original bid, a buyer counter, or a supplier reply. */
export interface OfferVersion {
  /** 1-based, chronological. Also the "Offer v{n}" / round label. */
  version: number
  by: 'supplier' | 'buyer'
  /** Offer total in SAR major units, VAT-inclusive. */
  totalSar: number
  deliveryDate: string
  paymentTermsLabel: string
  itemsCovered: number
  itemsTotal: number
  /** Free text typed by the buyer on a counter. */
  message?: string
  /** i18n key for a seeded/canned message (kept bilingual; resolved in the UI). */
  messageKey?: string
  messageParams?: Record<string, string | number>
  at: string
}

/** `active` = still open to counters; `ended` = buyer closed the conversation; `awarded` = won. */
export type NegotiationStatus = 'active' | 'ended' | 'awarded'

/** A per-supplier negotiation thread on an RFQ (buyer ↔ still-masked supplier). Persisted once touched. */
export interface NegotiationThread {
  bidId: string
  supplierLabel: string
  status: NegotiationStatus
  /** v1…vN, chronological. The latest supplier offer is what's "on the table". */
  offers: OfferVersion[]
  /** Offer expiry (from the bid's validUntil). */
  validUntil: string
  updatedAt: string
}

/** A free-text message in the post-award order conversation (identities revealed, terms locked). */
export interface OrderMessage {
  by: 'supplier' | 'buyer'
  /** Display author — a real name once identities are revealed, or "You". */
  author: string
  text: string
  at: string
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
