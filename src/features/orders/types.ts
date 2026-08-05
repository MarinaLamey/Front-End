/* Orders — the buyer's purchase-order lifecycle. An Order is created when an RFQ is
 * awarded (the PO is generated from the agreed offer) and moves through acceptance,
 * shipping, delivery and receipt. Money fields are SAR major units; VAT is 15%. */

export type OrderStatus =
  | 'awaiting_acceptance' // PO issued, supplier has not accepted yet
  | 'in_transit' // accepted + shipped, on its way
  | 'delivered' // supplier marked delivered, awaiting the buyer's receipt confirmation
  | 'closed' // buyer confirmed goods received
  | 'cancelled' // buyer cancelled before the supplier accepted
  | 'declined' // supplier declined the PO (void)

/** A party on the order (buyer or supplier) — revealed once the PO is issued. */
export interface OrderParty {
  name: string
  cr: string
  vat: string
  location: string
}

export interface OrderLine {
  description: string
  quantity: number
  unit: string
  /** Agreed unit price in SAR major units. */
  unitPriceSar: number
}

/** Supplier-reported shipment info (mimony does not connect to a carrier in this release). */
export interface Shipment {
  dispatchedAt?: string
  expectedArrival?: string
  deliveredAt?: string
  method?: string
  reference?: string // e.g. "DN-88214 / DN-88215 / DN-88216"
  deliverTo?: string
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
  /** RFQ record id used to open the message thread (equals rfqReference for seeded RFQs). */
  rfqId: string
  offerVersion: number
  title: string
  status: OrderStatus
  buyer: OrderParty
  supplier: OrderParty
  /** Short trading name for compact places (list, chips). */
  supplierShort: string
  lines: OrderLine[]
  paymentTermsLabel: string
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
}
