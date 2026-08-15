import type { Bid, NegotiationThread, RfqAward, RfqDraft, RfqStatus } from '../types'
import type { RfqDetail } from './deriveRfqDetail'

/**
 * The lifecycle status the RFQ moves to on award: fully `awarded` only when every line is sourced;
 * any line the winning bid(s) left uncovered (a split that didn't cover everything, or a sole bid
 * that skipped lines) leaves it `partially_awarded`.
 */
export function awardStatusFor(awards: RfqAward[]): RfqStatus {
  return awards.some((a) => a.unsourcedItems.length > 0) ? 'partially_awarded' : 'awarded'
}

/** Shared document sequence derived from the RFQ reference (e.g. RFQ-2026-0142 → 2026 / 0185). */
function docSeq(rfq: RfqDraft): { year: string; seq: string } {
  const [, year = String(new Date().getFullYear()), seq = '0'] = rfq.reference.split('-')
  const n = ((Number(seq) || 0) * 7 + 11) % 900
  return { year, seq: String(n + 80).padStart(4, '0') }
}

/**
 * Purchase-order number for an awarded RFQ (e.g. PO-2026-0185). `offset` bumps the sequence so a
 * split award issues one distinct PO per supplier (PO-2026-0185, PO-2026-0186, …).
 */
export function poNumber(rfq: RfqDraft, offset = 0): string {
  const { year, seq } = docSeq(rfq)
  return `PO-${year}-${String(Number(seq) + offset).padStart(4, '0')}`
}

/** Order number for an awarded RFQ — same sequence as the PO (e.g. ORD-2026-0185). */
export function orderNumber(rfq: RfqDraft): string {
  const { year, seq } = docSeq(rfq)
  return `ORD-${year}-${seq}`
}

function unsourcedFor(detail: RfqDetail, bid: Bid): string[] {
  return detail.lineItems.filter((_, i) => bid.unitPrices[i] === null).map((item) => item.name)
}

/** The 0-based RFQ line indexes a single bid actually prices (drives a single-supplier award's PO). */
function coveredLineIndexes(detail: RfqDetail, bid: Bid): number[] {
  return detail.lineItems.map((_, i) => i).filter((i) => bid.unitPrices[i] !== null)
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
    lineIndexes: coveredLineIndexes(detail, bid),
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
    lineIndexes: coveredLineIndexes(detail, bid),
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

/**
 * Compose a split award across the buyer's SELECTED bids. Each RFQ line is auto-allocated to the
 * lowest-unit-price selected bid that actually supplies it (unitPrice != null && qtyQuoted > 0);
 * a sole supplier wins its uncontested lines. Allocations are then grouped per supplier into one
 * {@link RfqAward} each — its own line indexes, agreed total, latest delivery and sequential PO.
 * Lines no selected bid covers fall out as `unsourcedItems` (shared across the returned awards).
 *
 * Assumption (mock): allocation is purely lowest-price-per-line; there's no min-order or
 * consolidation heuristic. The real BFF may allocate differently.
 */
export function buildAwards(rfq: RfqDraft, detail: RfqDetail, selectedBidIds: string[]): RfqAward[] {
  const selected = detail.bids.filter((b) => selectedBidIds.includes(b.id))
  const lineCount = detail.lineItems.length

  // Lowest-price selected supplier per line (null = no selected bid supplies it).
  const winnerByLine: (Bid | null)[] = []
  for (let li = 0; li < lineCount; li++) {
    let best: Bid | null = null
    let bestPrice = Number.POSITIVE_INFINITY
    for (const bid of selected) {
      const line = bid.lines[li]
      if (!line || line.unitPrice === null || line.qtyQuoted <= 0) continue
      if (line.unitPrice < bestPrice) {
        best = bid
        bestPrice = line.unitPrice
      }
    }
    winnerByLine.push(best)
  }

  const byBid = new Map<string, number[]>()
  winnerByLine.forEach((bid, li) => {
    if (!bid) return
    const indexes = byBid.get(bid.id) ?? []
    indexes.push(li)
    byBid.set(bid.id, indexes)
  })

  const unsourcedItems = detail.lineItems
    .filter((_, li) => winnerByLine[li] === null)
    .map((item) => item.name)

  // One award per supplier, ordered by their first line so PO numbering is stable.
  const groups = [...byBid.entries()].sort((a, b) => a[1][0] - b[1][0])

  return groups.map(([bidId, lineIndexes], k) => {
    const bid = selected.find((b) => b.id === bidId)!
    // VAT-inclusive lines at the quantity actually quoted, summed — nothing added on top. The same
    // arithmetic the bid form and the compare column use, so the PO value matches its offer.
    const agreedTotalSar =
      Math.round(
        lineIndexes.reduce((sum, li) => sum + (bid.lines[li].unitPrice as number) * bid.lines[li].qtyQuoted, 0) * 100,
      ) / 100
    // Reuse the single-award savings math, scaled to this supplier's allocated total.
    const savedVsOriginalSar =
      Math.round((agreedTotalSar * (0.02 + (bid.negotiationRounds - 1) * 0.015)) / 10) * 10

    return {
      bidId: bid.id,
      supplierLabel: bid.bidder,
      identity: bid.identity,
      agreedTotalSar,
      itemsCovered: lineIndexes.length,
      itemsTotal: detail.lineItems.length,
      lineIndexes,
      unsourcedItems,
      deliveryDate: bid.deliveryDate,
      paymentTermsLabel: bid.paymentTerms.label,
      negotiationRounds: bid.negotiationRounds,
      savedVsOriginalSar,
      offerVersion: bid.negotiationRounds,
      poNumber: poNumber(rfq, k),
      awardedAt: new Date().toISOString(),
    }
  })
}
