import type { Milestone, PaymentPreset } from './create/paymentRules'

/** Lifecycle of an RFQ. `draft` → (`pending_approval` →) `open`(live) → `awarded`/`closed`. */
export type RfqStatus = 'draft' | 'pending_approval' | 'open' | 'awarded' | 'closed'

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

/** The four terminal outcomes after leaving the wizard (each renders a result card). */
export type RfqOutcome = 'draft_saved' | 'published' | 'pending_approval' | 'verify_to_publish'

/** The result-card summary shown on any terminal outcome. */
export interface RfqResult {
  outcome: RfqOutcome
  reference: string
  status: RfqStatus
  category: string
  closingDate: string
  matchedSuppliers: number
}
