import type { Bid, NegotiationThread, RfqAward, RfqDraft } from '../types'
import type { RfqDetail } from './deriveRfqDetail'

/** Shared document sequence derived from the RFQ reference (e.g. RFQ-2026-0142 → 2026 / 0185). */
function docSeq(rfq: RfqDraft): { year: string; seq: string } {
  const [, year = String(new Date().getFullYear()), seq = '0'] = rfq.reference.split('-')
  const n = ((Number(seq) || 0) * 7 + 11) % 900
  return { year, seq: String(n + 80).padStart(4, '0') }
}

/** Purchase-order number for an awarded RFQ (e.g. PO-2026-0185). */
export function poNumber(rfq: RfqDraft): string {
  const { year, seq } = docSeq(rfq)
  return `PO-${year}-${seq}`
}

/** Order number for an awarded RFQ — same sequence as the PO (e.g. ORD-2026-0185). */
export function orderNumber(rfq: RfqDraft): string {
  const { year, seq } = docSeq(rfq)
  return `ORD-${year}-${seq}`
}

function unsourcedFor(detail: RfqDetail, bid: Bid): string[] {
  return detail.lineItems.filter((_, i) => bid.unitPrices[i] === null).map((item) => item.name)
}

/** Compose the confirmed award from the winning bid — negotiation shaves a little off the bid. */
export function buildAward(
  rfq: RfqDraft,
  detail: RfqDetail,
  bid: Bid,
  overrideReason?: string,
): RfqAward {
  const saved = Math.round((bid.totalSar * (0.02 + (bid.negotiationRounds - 1) * 0.015)) / 10) * 10

  return {
    bidId: bid.id,
    supplierLabel: bid.bidder,
    identity: bid.identity,
    agreedTotalSar: bid.totalSar - saved,
    itemsCovered: bid.itemsCovered,
    itemsTotal: bid.itemsTotal,
    unsourcedItems: unsourcedFor(detail, bid),
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

/**
 * Compose the award from a negotiation thread's on-the-table offer — the agreed terms are exactly
 * what's on the table (no heuristic discount), and the saving is measured against the original bid.
 */
export function buildAwardFromThread(
  rfq: RfqDraft,
  detail: RfqDetail,
  bid: Bid,
  thread: NegotiationThread,
  onTableOffer: NegotiationThread['offers'][number],
  overrideReason?: string,
): RfqAward {
  const original = thread.offers[0]
  const saved = Math.max(0, original.totalSar - onTableOffer.totalSar)

  return {
    bidId: bid.id,
    supplierLabel: bid.bidder,
    identity: bid.identity,
    agreedTotalSar: onTableOffer.totalSar,
    itemsCovered: onTableOffer.itemsCovered,
    itemsTotal: onTableOffer.itemsTotal,
    unsourcedItems: unsourcedFor(detail, bid),
    deliveryDate: onTableOffer.deliveryDate,
    paymentTermsLabel: onTableOffer.paymentTermsLabel,
    negotiationRounds: thread.offers.length,
    savedVsOriginalSar: saved,
    offerVersion: onTableOffer.version,
    poNumber: poNumber(rfq),
    overrideReason,
    awardedAt: new Date().toISOString(),
  }
}
