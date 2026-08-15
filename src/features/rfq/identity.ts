/* ────────────────────────────────────────────────────────────────────────────
 * IDENTITY REVEAL — the one predicate behind the blind marketplace.
 *
 * Both identities are exchanged at a single moment: when the awarded supplier
 * ACCEPTS their purchase order. Not when the buyer awards, and never merely
 * because a conversation ended — a closed negotiation was never accepted, so it
 * was never revealed and its row stays a label forever.
 *
 * Pure, and deliberately free of any import from the orders feature: the caller
 * passes the set of purchase orders that have been accepted, so this rule can be
 * read, tested and reused from either side of the marketplace without dragging a
 * second store behind it.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { RfqDraft, SupplierIdentity } from './types'

/**
 * Has the supplier behind `bidId` been revealed to the buyer? True only when this RFQ's award
 * names that bid AND the purchase order it produced has been accepted.
 *
 * @param acceptedPoNumbers PO references whose order is past acceptance. An empty set — the safe
 *   default when the caller has no order data to hand — keeps every identity masked.
 */
export function isIdentityRevealed(
  rfq: RfqDraft,
  bidId: string,
  acceptedPoNumbers: ReadonlySet<string>,
): boolean {
  const award = rfq.awards?.find((a) => a.bidId === bidId)
  return award ? acceptedPoNumbers.has(award.poNumber) : false
}

/**
 * The supplier's real details once revealed, otherwise `null`. Callers render the masked label
 * ("Supplier A") whenever this returns null, which is every state before acceptance.
 */
export function revealedSupplier(
  rfq: RfqDraft,
  bidId: string,
  acceptedPoNumbers: ReadonlySet<string>,
): SupplierIdentity | null {
  const award = rfq.awards?.find((a) => a.bidId === bidId)
  if (!award || !acceptedPoNumbers.has(award.poNumber)) return null
  return award.identity
}

/**
 * What to print for a supplier: their company name once the purchase order is accepted, and the
 * blind label until then.
 */
export function supplierDisplayName(
  rfq: RfqDraft,
  bidId: string,
  maskedLabel: string,
  acceptedPoNumbers: ReadonlySet<string>,
): string {
  return revealedSupplier(rfq, bidId, acceptedPoNumbers)?.companyName ?? maskedLabel
}
