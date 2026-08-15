/* Per-step validity for the Create-RFQ wizard — pure predicates the footer's Next/Submit
 * button and each field's success/error state read from (the CTA-disabled-until-valid rule). */

import type { LineItem, RfqDraft } from '../types'
import type { RfqStep } from './rfqDraftStore'
import { validatePayment } from './paymentRules'

/** A line item counts toward the RFQ once it has a name, a positive quantity and a unit. */
export function isLineItemValid(item: LineItem): boolean {
  return item.name.trim().length > 0 && item.quantity > 0 && item.unit.trim().length > 0
}

/** Step 1 — at least one category, an RFQ title and at least one valid line item are required. */
export function requirementValid(draft: RfqDraft): boolean {
  return (
    draft.categories.length > 0 &&
    draft.title.trim().length > 0 &&
    draft.lineItems.some(isLineItemValid)
  )
}

/** The number of valid line items — the ceiling for the items-per-bid range. */
export function itemCount(draft: RfqDraft): number {
  return draft.lineItems.filter(isLineItemValid).length
}

/**
 * Items-per-bid is coherent when partial bids are allowed: 1 ≤ min ≤ max ≤ total item count
 * (a `maxItemsPerBid` of 0 means "all", i.e. the full item count). No constraint when partial
 * bids are off (a supplier must then quote everything).
 */
export function itemsPerBidValid(draft: RfqDraft): boolean {
  if (!draft.partialBidsAllowed) return true
  const total = itemCount(draft)
  const max = draft.maxItemsPerBid === 0 ? total : draft.maxItemsPerBid
  return draft.minItemsPerBid >= 1 && draft.minItemsPerBid <= max && max <= total
}

/** The closing date must not fall after the required delivery date. */
export function closingBeforeDelivery(draft: RfqDraft): boolean {
  if (!draft.closingDate || !draft.requiredDeliveryDate) return true
  return new Date(draft.closingDate).getTime() <= new Date(draft.requiredDeliveryDate).getTime()
}

/**
 * The bidding window must run forwards: the buyer sets both ends explicitly, so a close that lands
 * on or before the open is a real error rather than something to silently normalise.
 */
export function biddingWindowValid(draft: RfqDraft): boolean {
  if (!draft.openingDate || !draft.closingDate) return true
  return new Date(draft.openingDate).getTime() < new Date(draft.closingDate).getTime()
}

/** Step 2 — the window and delivery dates are set and coherent, plus an address and a valid schedule. */
export function deliveryValid(draft: RfqDraft): boolean {
  const datesOk =
    draft.requiredDeliveryDate.length > 0 &&
    draft.openingDate.length > 0 &&
    draft.closingDate.length > 0 &&
    biddingWindowValid(draft) &&
    closingBeforeDelivery(draft)
  const addressOk = draft.deliverToCompanyAddress || draft.deliveryAddress.trim().length > 0
  const paymentOk = validatePayment(draft.milestones).valid
  return datesOk && addressOk && paymentOk && itemsPerBidValid(draft)
}

/**
 * Step 3 — nothing here is required. Regions default to "All regions" (an empty list = every region),
 * which is a valid state to proceed from; certifications, acceptance criteria and warranty are all
 * optional. The step is therefore always submittable.
 */
export function suppliersValid(_draft: RfqDraft): boolean {
  return true
}

/** Whether the given step's requirements are met (step 4 Review is always submittable). */
export function stepValid(step: RfqStep, draft: RfqDraft): boolean {
  switch (step) {
    case 1:
      return requirementValid(draft)
    case 2:
      return deliveryValid(draft)
    case 3:
      return suppliersValid(draft)
    case 4:
      return true
  }
}
