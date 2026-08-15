/* ────────────────────────────────────────────────────────────────────────────
 * BID RULES — what makes a bid sendable (spec §6).
 *
 * A bid needs at least one priced line, a price, a quantity and a delivery date on
 * every line it does price, enough lines to meet the buyer's partial-bid minimum
 * (and no more than the maximum), and a validity date still in the future.
 *
 * These live outside the page because they are rules, not layout: the form reads
 * them to dim the Submit button, and they stay testable without rendering anything.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { LineItem, RfqDraft, SupplierBidLine } from '../types'

export interface BidEligibility {
  /** Lines carrying a real price — what "items priced" counts. */
  pricedCount: number
  /** Fewest / most lines this RFQ accepts on one bid. */
  minItems: number
  maxItems: number
  /** Every line the supplier ticked is fully filled in. */
  linesComplete: boolean
  /**
   * Every quoted line's quantity sits inside the range the buyer set for that line. Lines with no
   * bounds always pass. Indexes of the lines that fail, so the form can mark them individually.
   */
  quantityOutOfRange: number[]
  /** The validity date is set and still ahead of us. */
  validityOk: boolean
  /** All of the above — the Submit button's enabled state. */
  canSubmit: boolean
}

/**
 * Is this offered quantity acceptable for this line? A missing bound is no bound, so a line the
 * buyer left open accepts anything above zero — the behaviour every line had before ranges existed.
 */
export function quantityInRange(item: LineItem | undefined, quantity: number): boolean {
  if (!item) return true
  if (item.minQuantity !== undefined && quantity < item.minQuantity) return false
  if (item.maxQuantity !== undefined && quantity > item.maxQuantity) return false
  return true
}

/** Is this ISO date still ahead of now? */
export function isFutureDate(iso: string): boolean {
  return Boolean(iso) && new Date(iso).getTime() > Date.now()
}

/** Check a bid form against the RFQ's own bidding rules. */
export function bidEligibility(
  rfq: RfqDraft,
  lineCount: number,
  lines: SupplierBidLine[],
  validUntil: string,
  /** The RFQ's own line items, carrying each line's accepted quantity range. */
  items: LineItem[] = [],
): BidEligibility {
  const included = lines.filter((line) => line.included)
  const pricedCount = included.filter((line) => line.unitPriceSar > 0).length

  // A buyer who disallowed partial bids is asking for every line; `maxItemsPerBid: 0` means "all".
  const minItems = rfq.partialBidsAllowed ? Math.max(1, rfq.minItemsPerBid) : lineCount
  const maxItems = rfq.maxItemsPerBid > 0 ? rfq.maxItemsPerBid : lineCount

  const linesComplete = included.every(
    (line) => line.unitPriceSar > 0 && line.quantity > 0 && Boolean(line.deliveryDate),
  )

  // Item-count limits and per-line quantity limits are separate gates: covering enough lines does
  // not excuse offering a quantity the buyer said they will not accept on one of them.
  const quantityOutOfRange: number[] = []
  for (const line of included) {
    if (!quantityInRange(items[line.index], line.quantity)) quantityOutOfRange.push(line.index)
  }

  const validityOk = isFutureDate(validUntil)

  return {
    pricedCount,
    minItems,
    maxItems,
    linesComplete,
    quantityOutOfRange,
    validityOk,
    canSubmit:
      pricedCount >= minItems &&
      pricedCount <= maxItems &&
      linesComplete &&
      quantityOutOfRange.length === 0 &&
      validityOk,
  }
}
