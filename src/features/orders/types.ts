/* Orders — the buyer's purchase-order lifecycle. An Order is created when an RFQ is
 * awarded (the PO is generated from the agreed offer) and moves through acceptance,
 * shipping, delivery and receipt. Money fields are SAR major units; VAT is 15%. */

/**
 * The order lifecycle (SoT §2.2). Five steps and four endings; each side reads the same stored state
 * with its own word, because each side is being told what to do next:
 *
 *   stored                      buyer sees                  supplier sees
 *   awaiting_acceptance         Awaiting supplier           To review
 *   accepted_awaiting_dispatch  Accepted, awaiting dispatch Assign delivery
 *   in_transit                  In transit                  In fulfilment
 *   delivered                   Delivered                   Awaiting buyer
 *   closed                      Closed                      Closed
 *
 * The four endings — closed, cancelled, declined, expired — are worded the same on both sides.
 * "Void" is not a word this product uses anywhere.
 */
export type OrderStatus =
  | 'awaiting_acceptance' // PO issued, supplier has not accepted yet
  | 'accepted_awaiting_dispatch' // accepted, but no dispatch date entered yet
  | 'in_transit' // dispatch date entered, on its way
  | 'delivered' // supplier marked delivered, awaiting the buyer's receipt confirmation
  | 'closed' // buyer confirmed receipt — the only thing that closes an order
  | 'cancelled' // buyer asked before acceptance and the supplier consented
  | 'declined' // supplier declined the PO
  | 'expired' // nobody accepted within 168 hours of issue

/** A party on the order (buyer or supplier) — revealed once the PO is issued. */
export interface OrderParty {
  name: string
  cr: string
  vat: string
  location: string
  /**
   * Named person to deal with, shown on the order conversation once identities are revealed. Never
   * shown before that — it is identifying information like any other. Optional: an organisation may
   * not have nominated one.
   */
  contactName?: string
}

export interface OrderLine {
  description: string
  quantity: number
  unit: string
  /** Agreed unit price in SAR major units — VAT-INCLUSIVE (line totals sum to the order total). */
  unitPriceSar: number
  /** Agreed per-line delivery date (ISO) — carried from the agreed offer's line schedule. */
  deliveryDate?: string
}

/** When a payment milestone is due — mirrors the RFQ/offer payment triggers. */
export type OrderMilestoneTrigger = 'on_confirmation' | 'on_delivery' | 'on_installation' | 'on_inspection'

/** One row of the PO payment schedule, carried from the agreed offer. Amount is derived (% × total). */
export interface OrderMilestone {
  trigger: OrderMilestoneTrigger
  /** Whole-number percentage of the order total. */
  percent: number
}

/** One version in the pre-award offer/negotiation history, carried onto the order for the conversation. */
export interface OrderOffer {
  version: number
  by: 'buyer' | 'supplier'
  /** 'original' | 'counter' | 'latest' — drives the little tag chip. */
  tag?: 'original' | 'counter' | 'latest'
  totalSar: number
  deliveryDate: string
  paymentTermsLabel: string
  itemsCovered: number
  itemsTotal: number
  message?: string
  at: string
}

/** Supplier-reported shipment info (mimony does not connect to a carrier in this release). */
export interface Shipment {
  dispatchedAt?: string
  expectedArrival?: string
  deliveredAt?: string
  method?: string
  reference?: string // e.g. "DN-88214 / DN-88215 / DN-88216"
  deliverTo?: string
  /** The supplier's own words for where the shipment is, e.g. "Dispatched, in transit". */
  statusNote?: string
  /** A note the supplier addressed to the buyer with this update (site access, split delivery…). */
  note?: string
  /** Documents the supplier attached to the shipment record — visible to the buyer on their order. */
  certificates?: string[]
}

/**
 * The buyer has asked to cancel an order the supplier already ACCEPTED. An accepted order binds
 * both sides, so nothing changes until the supplier answers (spec: mutual agreement required).
 */
export interface CancellationRequest {
  /** Short tag behind the reason chip, e.g. `budget_withdrawn`. */
  reasonTag: string
  note: string
  requestedByName: string
  requestedAt: string
  /** Absent while the supplier has not answered. */
  outcome?: 'agreed' | 'declined'
  respondedAt?: string
}

/** The buyer's recorded receipt for a line (by line index). */
export interface ReceiptLine {
  received: number
  note?: string
}

/** A free-text message in the order's supplier conversation. */
export interface OrderMessage {
  by: 'buyer' | 'supplier'
  text: string
  at: string
}

/** A reported delivery issue (kept on the order; the order stays open). */
export interface OrderIssue {
  category: string
  lineIndexes: number[]
  description: string
  evidence: string[]
  reportedAt: string
}

export interface Order {
  id: string // ORD-2026-0088
  poNumber: string // PO-2026-0088
  /** The RFQ this order was awarded from — links back to negotiation/offer history. */
  rfqReference: string
  /** When an RFQ is split across suppliers, this order's position (1-based) and the split size. */
  splitIndex?: number
  splitTotal?: number
  /** RFQ record id used to open the message thread (equals rfqReference for seeded RFQs). */
  rfqId: string
  offerVersion: number
  /** The agreed PO total (from negotiation) — the authoritative order value. May differ from the
   * raw line-item sum, since negotiation moved the total, not each line. Falls back to computed. */
  agreedTotalSar?: number
  title: string
  status: OrderStatus
  buyer: OrderParty
  supplier: OrderParty
  /** Short trading name for compact places (list, chips). */
  supplierShort: string
  /** Anonymized label ("Supplier A/B/C") shown until the supplier ACCEPTS the PO (reveal-on-acceptance). */
  supplierAnonLabel?: string
  lines: OrderLine[]
  paymentTermsLabel: string
  /** Structured payment schedule carried from the agreed offer (drives the Payment schedule card). */
  paymentMilestones?: OrderMilestone[]
  /** Items covered vs the RFQ's total item count (e.g. 4 of 5) — from the agreed offer. */
  itemsCovered?: number
  itemsTotal?: number
  /** Pre-award offer/negotiation history, for the order conversation. */
  offerHistory?: OrderOffer[]
  shipment: Shipment
  issuedAt: string
  acceptedAt?: string
  closedAt?: string
  cancelledAt?: string
  cancelReason?: string
  cancelNote?: string
  declinedAt?: string
  declineReason?: string
  declineReasonTag?: string
  declinedByName?: string
  /** Hours the PO was held before the supplier declined (display only). */
  declineHeldHours?: number
  /** Runner-up bid, for the cancel / declined resolution flows. */
  runnerUp?: { supplierLabel: string; totalSar: number; itemsCovered: number; itemsTotal: number; validUntil: string }
  /** Buyer receipt by line index — set on confirm. */
  receipt?: Record<number, ReceiptLine>
  /** Reported issue, if any. */
  issue?: OrderIssue
  /** Buyer↔supplier free-text messages on this order. */
  messages?: OrderMessage[]
  /**
   * Set when the buyer asks to cancel an order the supplier already accepted. The order's own
   * `status` is untouched until the supplier answers — nothing changes without their agreement.
   */
  cancellationRequest?: CancellationRequest
}
