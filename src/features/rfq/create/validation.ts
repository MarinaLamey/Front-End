/* Per-step validity for the Create-RFQ wizard — pure predicates the footer's Next/Submit
 * button and each field's success/error state read from (the CTA-disabled-until-valid rule). */

import type { LineItem, RfqDraft } from '../types'
import type { RfqStep } from './rfqDraftStore'
import { validatePayment } from './paymentRules'

/** A line item counts toward the RFQ once it has a name, a positive quantity and a unit. */
export function isLineItemValid(item: LineItem): boolean {
  return item.name.trim().length > 0 && item.quantity > 0 && item.unit.trim().length > 0
}

/** Step 1 — Category, RFQ title and at least one valid line item are required. */
export function requirementValid(draft: RfqDraft): boolean {
  return (
    draft.category.trim().length > 0 &&
    draft.title.trim().length > 0 &&
    draft.lineItems.some(isLineItemValid)
  )
}

/** The closing date must not fall after the required delivery date. */
export function closingBeforeDelivery(draft: RfqDraft): boolean {
  if (!draft.closingDate || !draft.requiredDeliveryDate) return true
  return new Date(draft.closingDate).getTime() <= new Date(draft.requiredDeliveryDate).getTime()
}

/** Step 2 — both dates set and coherent, a delivery address, and a rule-valid payment schedule. */
export function deliveryValid(draft: RfqDraft): boolean {
  const datesOk =
    draft.requiredDeliveryDate.length > 0 &&
    draft.closingDate.length > 0 &&
    closingBeforeDelivery(draft)
  const addressOk = draft.deliverToCompanyAddress || draft.deliveryAddress.trim().length > 0
  const paymentOk = validatePayment(draft.milestones).valid
  return datesOk && addressOk && paymentOk
}

/** Step 3 — the RFQ must reach at least one supplier region. */
export function suppliersValid(draft: RfqDraft): boolean {
  return draft.regions.length > 0
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
