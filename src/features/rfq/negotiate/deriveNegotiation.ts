/* ────────────────────────────────────────────────────────────────────────────
 * NEGOTIATION — derives a buyer↔supplier offer thread from a bid, and applies buyer
 * counters (with a deterministic supplier reply so the table stays live). Threads are
 * seeded from the RFQ reference + bid id so they're STABLE across reloads until the
 * buyer acts; once a counter/end happens the thread is persisted on the RfqDraft. This
 * is the mock stand-in for the eventual negotiation API.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { Bid, NegotiationThread, OfferVersion, RfqDraft } from '../types'
import type { RfqDetail } from '../detail/deriveRfqDetail'
import { addDays, addMinutes, seededRng } from '../detail/deriveRfqDetail'

const tidy = (n: number) => Math.round(n / 10) * 10

/** The latest supplier offer — what the buyer can accept & award. */
export function onTable(thread: NegotiationThread): OfferVersion {
  for (let i = thread.offers.length - 1; i >= 0; i--) {
    if (thread.offers[i].by === 'supplier') return thread.offers[i]
  }
  return thread.offers[thread.offers.length - 1]
}

/** The buyer's most recent counter, if any (used for the "vs your counter" delta). */
export function lastBuyerOffer(thread: NegotiationThread): OfferVersion | undefined {
  for (let i = thread.offers.length - 1; i >= 0; i--) {
    if (thread.offers[i].by === 'buyer') return thread.offers[i]
  }
  return undefined
}

/** True once the ball is in the supplier's court (buyer countered after the latest supplier offer). */
export function awaitingSupplier(thread: NegotiationThread): boolean {
  return thread.offers[thread.offers.length - 1]?.by === 'buyer'
}

/**
 * Build the seeded starting thread for a bid. A `negotiating` bid gets a 3-version history
 * (supplier original → buyer counter → supplier latest), a freshly `submitted` bid just the
 * original bid. `bid.totalSar` is always the latest supplier number ("on the table").
 */
export function deriveThread(rfq: RfqDraft, detail: RfqDetail, bid: Bid): NegotiationThread {
  const rng = seededRng(`${rfq.reference}:nego:${bid.id}`)
  const negotiating = bid.status === 'negotiating'
  const latest = bid.totalSar
  const terms = bid.paymentTerms.label
  const covered = bid.itemsCovered
  const total = bid.itemsTotal
  const start = addDays(rfq.createdAt, 1)
  const unsourced = detail.lineItems.find((_, i) => bid.unitPrices[i] === null)?.name

  const offers: OfferVersion[] = []

  // v1 — supplier's original bid (a little above the latest when a negotiation has happened).
  const original = negotiating ? tidy(latest * (1.03 + rng() * 0.02)) : latest
  offers.push({
    version: 1,
    by: 'supplier',
    totalSar: original,
    deliveryDate: negotiating ? addDays(bid.deliveryDate, 1) : bid.deliveryDate,
    paymentTermsLabel: terms,
    itemsCovered: covered,
    itemsTotal: total,
    messageKey: unsourced ? 'rfq.nego.seed.supplierOriginalDrop' : 'rfq.nego.seed.supplierOriginal',
    messageParams: unsourced ? { item: unsourced } : {},
    at: addMinutes(start, 84),
  })

  if (negotiating) {
    // v2 — buyer counter, below the latest and asking for delivery a touch earlier.
    const counter = tidy(latest * (0.95 - rng() * 0.02))
    offers.push({
      version: 2,
      by: 'buyer',
      totalSar: counter,
      deliveryDate: addDays(bid.deliveryDate, -2),
      paymentTermsLabel: terms,
      itemsCovered: covered,
      itemsTotal: total,
      messageKey: 'rfq.nego.seed.buyerCounter',
      messageParams: { amount: counter, lines: covered },
      at: addMinutes(addDays(start, 0), 362),
    })

    // v3 — supplier's latest: meets the delivery ask, holds nearer their number.
    offers.push({
      version: 3,
      by: 'supplier',
      totalSar: latest,
      deliveryDate: bid.deliveryDate,
      paymentTermsLabel: terms,
      itemsCovered: covered,
      itemsTotal: total,
      messageKey: 'rfq.nego.seed.supplierLatest',
      messageParams: { amount: counter, best: latest },
      at: addMinutes(addDays(start, 1), 21),
    })
  }

  return {
    bidId: bid.id,
    supplierLabel: bid.bidder,
    status: 'active',
    offers,
    validUntil: bid.validUntil,
    updatedAt: offers[offers.length - 1].at,
  }
}

/** The persisted thread if the buyer has touched it, otherwise the seeded starting thread. */
export function getThread(rfq: RfqDraft, detail: RfqDetail, bid: Bid): NegotiationThread {
  return rfq.negotiations?.[bid.id] ?? deriveThread(rfq, detail, bid)
}

export interface CounterInput {
  totalSar: number
  deliveryDate: string
  paymentTermsLabel: string
  message: string
}

/**
 * Apply a buyer counter and a deterministic supplier reply so the table stays live: the supplier
 * concedes toward the buyer (splitting the gap, never below the ask) and takes the buyer's date.
 */
export function applyBuyerCounter(thread: NegotiationThread, input: CounterInput): NegotiationThread {
  const current = onTable(thread)
  const nextVersion = thread.offers.length + 1
  const now = new Date().toISOString()

  const buyerOffer: OfferVersion = {
    version: nextVersion,
    by: 'buyer',
    totalSar: input.totalSar,
    deliveryDate: input.deliveryDate,
    paymentTermsLabel: input.paymentTermsLabel,
    itemsCovered: current.itemsCovered,
    itemsTotal: current.itemsTotal,
    message: input.message.trim() || undefined,
    messageKey: input.message.trim() ? undefined : 'rfq.nego.seed.buyerCounterShort',
    messageParams: input.message.trim() ? undefined : { amount: input.totalSar },
    at: now,
  }

  // Supplier reply: concede halfway to the ask (tidy, never below it); take the buyer's date.
  const gap = current.totalSar - input.totalSar
  const conceded = gap > 20 ? tidy(input.totalSar + gap / 2) : current.totalSar
  const moved = conceded < current.totalSar
  const supplierReply: OfferVersion = {
    version: nextVersion + 1,
    by: 'supplier',
    totalSar: conceded,
    deliveryDate: input.deliveryDate,
    paymentTermsLabel: input.paymentTermsLabel,
    itemsCovered: current.itemsCovered,
    itemsTotal: current.itemsTotal,
    messageKey: moved ? 'rfq.nego.seed.supplierConcede' : 'rfq.nego.seed.supplierHold',
    messageParams: { amount: conceded },
    at: addMinutes(now, 3),
  }

  return {
    ...thread,
    offers: [...thread.offers, buyerOffer, supplierReply],
    updatedAt: supplierReply.at,
  }
}

/** Other suppliers on the same RFQ the buyer could also be negotiating with (for the side rail). */
export function otherThreads(rfq: RfqDraft, detail: RfqDetail, exceptBidId: string): NegotiationThread[] {
  return detail.bids
    .filter((b) => b.id !== exceptBidId)
    .map((b) => getThread(rfq, detail, b))
    .sort((a, b) => onTable(a).totalSar - onTable(b).totalSar)
}
