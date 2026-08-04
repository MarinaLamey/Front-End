import type { Bid, RfqAward, RfqDraft } from '../types'
import type { RfqDetail } from './deriveRfqDetail'

/** Deterministic PO number from the RFQ reference's sequence (e.g. RFQ-2026-0142 → PO-2026-0088). */
function poNumber(rfq: RfqDraft): string {
  const [, year = String(new Date().getFullYear()), seq = '0'] = rfq.reference.split('-')
  const n = ((Number(seq) || 0) * 7 + 11) % 900
  return `PO-${year}-${String(n + 80).padStart(4, '0')}`
}

/** Compose the confirmed award from the winning bid — negotiation shaves a little off the bid. */
export function buildAward(
  rfq: RfqDraft,
  detail: RfqDetail,
  bid: Bid,
  overrideReason?: string,
): RfqAward {
  const saved = Math.round((bid.totalSar * (0.02 + (bid.negotiationRounds - 1) * 0.015)) / 10) * 10
  const unsourcedItems = detail.lineItems
    .filter((_, i) => bid.unitPrices[i] === null)
    .map((item) => item.name)

  return {
    bidId: bid.id,
    supplierLabel: bid.bidder,
    identity: bid.identity,
    agreedTotalSar: bid.totalSar - saved,
    itemsCovered: bid.itemsCovered,
    itemsTotal: bid.itemsTotal,
    unsourcedItems,
    deliveryDate: bid.deliveryDate,
    paymentTermsLabel: bid.paymentTerms.label,
    negotiationRounds: bid.negotiationRounds,
    savedVsOriginalSar: saved,
    offerVersion: bid.negotiationRounds,
    poNumber: poNumber(rfq),
    overrideReason,
    awardedAt: new Date().toISOString(),
  }
}
