/* ────────────────────────────────────────────────────────────────────────────
 * NEGOTIATION — derives a buyer↔supplier offer thread from a bid, and applies buyer
 * counters (with a deterministic supplier reply so the table stays live). Threads are
 * seeded from the RFQ reference + bid id so they're STABLE across reloads until the
 * buyer acts; once a counter/end happens the thread is persisted on the RfqDraft. This
 * is the mock stand-in for the eventual negotiation API.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { Bid, LineItem, NegotiationThread, OfferLine, OfferVersion, RfqDraft } from '../types'
import type { Milestone, PaymentPreset } from '../create/paymentRules'
import type { RfqDetail } from '../detail/deriveRfqDetail'
import { addDays, addMinutes, seededRng } from '../detail/deriveRfqDetail'
import { priceTotals } from '../vat'

const tidy = (n: number) => Math.round(n / 10) * 10

/** Sum of an offer's included lines (VAT-inclusive unit price × quantity) — the offer TOTAL. */
export function linesTotal(lines: OfferLine[]): number {
  return lines.reduce((sum, line) => sum + (line.included ? line.unitPriceSar * line.quantity : 0), 0)
}

/**
 * The headline an offer is quoted at. Unit prices are VAT-INCLUSIVE, so this is simply the sum of
 * the included lines — nothing is added on top.
 */
export function offerTotal(lines: OfferLine[]): number {
  return priceTotals(linesTotal(lines)).total
}

/**
 * Build the per-line breakdown for an offer from the bid's line detail, scaling the VAT-inclusive unit
 * prices so the included lines sum to `targetTotal` NET of VAT — this keeps a seeded round total
 * (original/counter/latest) coherent with a plausible line breakdown. A line the bidder isn't
 * supplying is carried as excluded.
 */
function offerLines(lineItems: LineItem[], bid: Bid, targetTotal: number, deliveryDate: string): OfferLine[] {
  const base = lineItems.map((item, i) => {
    const bl = bid.lines[i]
    const unitPrice = bl?.unitPrice ?? null
    return {
      index: i,
      name: item.name,
      unit: item.unit,
      // A supplied line carries the quantity actually quoted — a short quote stays short through
      // the whole negotiation rather than silently going back up to what the buyer asked for.
      quantity: (unitPrice != null ? bl?.qtyQuoted : bl?.qtyRequired) ?? item.quantity,
      unitPrice: unitPrice ?? 0,
      included: unitPrice != null,
    }
  })
  const baseSum = base.reduce((sum, l) => sum + (l.included ? l.unitPrice * l.quantity : 0), 0)
  // Both sides of this ratio are VAT-inclusive, so no conversion is needed.
  const factor = baseSum > 0 ? targetTotal / baseSum : 1
  // Two decimals, not whole SAR: unit prices here are per-piece (rebar at 2.75), and rounding to
  // the riyal would drift the line sum away from the total the offer is quoted at.
  return base.map((l) => ({
    index: l.index,
    name: l.name,
    unit: l.unit,
    quantity: l.quantity,
    unitPriceSar: l.included ? Math.round(l.unitPrice * factor * 100) / 100 : 0,
    included: l.included,
    deliveryDate,
  }))
}

/**
 * An offer's headline delivery date: the LATEST of its included lines, because the buyer is only
 * complete once the last line lands. Falls back to `fallback` for lines written before per-line
 * dates existed.
 */
function latestDelivery(lines: OfferLine[], fallback: string): string {
  let latest = ''
  for (const line of lines) {
    if (line.included && line.deliveryDate && line.deliveryDate > latest) latest = line.deliveryDate
  }
  return latest || fallback
}

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
 * When the conversation actually lapses. Bid validity may be raised with any new offer version,
 * FORWARD ONLY, so the effective expiry is the LATEST `bidValidUntil` across every version — never
 * the thread's original date once a later version has moved it. Both sides count from this same
 * instant, so neither can be shown a different number of days left.
 */
export function effectiveExpiry(thread: NegotiationThread): string {
  let latest = thread.validUntil
  for (const offer of thread.offers) {
    if (offer.bidValidUntil && offer.bidValidUntil > latest) latest = offer.bidValidUntil
  }
  return latest
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
  const unsourced = detail.lineItems.find((_, i) => bid.unitPrices[i] === null)?.name

  /**
   * Offers are placed as fractions of the RFQ's own life rather than at fixed day offsets: a
   * two-day-old RFQ would otherwise date its third offer tomorrow, and the inbox would report a
   * negotiation that "last moved in 21 minutes". The window runs from publication to now, or to
   * the closing date once that has passed.
   */
  const opened = new Date(rfq.createdAt).getTime()
  const closes = rfq.closingDate ? new Date(rfq.closingDate).getTime() : Number.POSITIVE_INFINITY
  const endsAt = Math.max(Math.min(Date.now(), closes), opened + 3 * 3_600_000)
  const at = (fraction: number) => new Date(opened + (endsAt - opened) * fraction).toISOString()

  const offers: OfferVersion[] = []

  // Every offer's headline is derived FROM its lines, never the other way round: the seeded target
  // only shapes the per-line prices, and `offerTotal` then states what those lines actually come to.
  // That is what lets the negotiation form promise "lines total … matches your offer".
  const roundAt = (target: number, deliveryDate: string) => {
    const lines = offerLines(detail.lineItems, bid, target, deliveryDate)
    return { lines, totalSar: offerTotal(lines), deliveryDate }
  }

  // Every seeded offer carries the RFQ's own schedule, so opening the counter form's payment-terms
  // editor shows the real milestone triggers rather than an empty custom schedule.
  const schedule = { paymentPreset: rfq.paymentPreset, paymentMilestones: rfq.milestones }

  // v1 — supplier's original bid (a little above the latest when a negotiation has happened).
  const v1 = roundAt(
    negotiating ? tidy(latest * (1.03 + rng() * 0.02)) : latest,
    negotiating ? addDays(bid.deliveryDate, 1) : bid.deliveryDate,
  )
  offers.push({
    version: 1,
    by: 'supplier',
    totalSar: v1.totalSar,
    lines: v1.lines,
    deliveryDate: v1.deliveryDate,
    paymentTermsLabel: terms,
    ...schedule,
    itemsCovered: covered,
    itemsTotal: total,
    messageKey: unsourced ? 'rfq.nego.seed.supplierOriginalDrop' : 'rfq.nego.seed.supplierOriginal',
    messageParams: unsourced ? { item: unsourced } : {},
    at: at(0.2),
  })

  if (negotiating) {
    // v2 — buyer counter, below the latest and asking for delivery a touch earlier.
    const v2 = roundAt(tidy(latest * (0.95 - rng() * 0.02)), addDays(bid.deliveryDate, -2))
    offers.push({
      version: 2,
      by: 'buyer',
      totalSar: v2.totalSar,
      lines: v2.lines,
      deliveryDate: v2.deliveryDate,
      paymentTermsLabel: terms,
      ...schedule,
      itemsCovered: covered,
      itemsTotal: total,
      messageKey: 'rfq.nego.seed.buyerCounter',
      messageParams: { amount: v2.totalSar, lines: covered },
      at: at(0.5),
    })

    // v3 — supplier's latest: meets the delivery ask, holds nearer their number.
    const v3 = roundAt(latest, bid.deliveryDate)
    offers.push({
      version: 3,
      by: 'supplier',
      totalSar: v3.totalSar,
      lines: v3.lines,
      deliveryDate: v3.deliveryDate,
      paymentTermsLabel: terms,
      ...schedule,
      itemsCovered: covered,
      itemsTotal: total,
      messageKey: 'rfq.nego.seed.supplierLatest',
      messageParams: { amount: v2.totalSar, best: v3.totalSar },
      at: at(0.82),
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

/** A buyer's counter on a single line — the unit of negotiation. */
export interface CounterLineInput {
  index: number
  unitPriceSar: number
  quantity: number
  included: boolean
  /** When this line is asked for (ISO). Lines may differ; the offer takes the latest. */
  deliveryDate?: string
}

export interface CounterInput {
  lines: CounterLineInput[]
  /** Fallback date for lines that carry none of their own. */
  deliveryDate: string
  paymentTermsLabel: string
  /** The schedule behind the label, when the party edited one. */
  paymentPreset?: PaymentPreset
  paymentMilestones?: Milestone[]
  message: string
}

/**
 * Apply a buyer counter (line-by-line: per-line price + quantity + include/exclude) and a
 * deterministic supplier reply so the table stays live: on each included line the supplier concedes
 * halfway from its last price toward the buyer's ask (never below it), honours the buyer's include
 * set + quantities, and takes the buyer's date. Every total is the sum of the included lines.
 */
export function applyBuyerCounter(thread: NegotiationThread, input: CounterInput): NegotiationThread {
  const current = onTable(thread)
  const currentLines = current.lines ?? []
  const nextVersion = thread.offers.length + 1
  const now = new Date().toISOString()

  const buyerLines: OfferLine[] = input.lines.map((l) => {
    const cur = currentLines.find((c) => c.index === l.index)
    return {
      index: l.index,
      name: cur?.name ?? '',
      unit: cur?.unit ?? '',
      quantity: l.quantity,
      unitPriceSar: l.unitPriceSar,
      included: l.included,
      deliveryDate: l.deliveryDate || input.deliveryDate,
    }
  })
  const buyerTotal = offerTotal(buyerLines)
  const schedule = {
    paymentTermsLabel: input.paymentTermsLabel,
    paymentPreset: input.paymentPreset,
    paymentMilestones: input.paymentMilestones,
  }
  const buyerDelivery = latestDelivery(buyerLines, input.deliveryDate)
  const buyerOffer: OfferVersion = {
    version: nextVersion,
    by: 'buyer',
    totalSar: buyerTotal,
    lines: buyerLines,
    deliveryDate: buyerDelivery,
    ...schedule,
    itemsCovered: buyerLines.filter((l) => l.included).length,
    itemsTotal: current.itemsTotal,
    message: input.message.trim() || undefined,
    messageKey: input.message.trim() ? undefined : 'rfq.nego.seed.buyerCounterShort',
    messageParams: input.message.trim() ? undefined : { amount: buyerTotal },
    at: now,
  }

  const supplierLines: OfferLine[] = buyerLines.map((bl) => {
    const cur = currentLines.find((c) => c.index === bl.index)
    const curPrice = cur?.unitPriceSar ?? bl.unitPriceSar
    const gap = curPrice - bl.unitPriceSar
    // Two decimals, as everywhere else: these are per-piece prices (rebar at 2.75), and snapping the
    // concession to the riyal would drift the reply away from the lines it is built from.
    const conceded = gap > 0.02 ? Math.round((bl.unitPriceSar + gap / 2) * 100) / 100 : curPrice
    return { ...bl, unitPriceSar: bl.included ? conceded : 0 }
  })
  const supplierTotal = offerTotal(supplierLines)
  const moved = supplierTotal < current.totalSar

  const supplierReply: OfferVersion = {
    version: nextVersion + 1,
    by: 'supplier',
    totalSar: supplierTotal,
    lines: supplierLines,
    deliveryDate: buyerDelivery,
    ...schedule,
    itemsCovered: supplierLines.filter((l) => l.included).length,
    itemsTotal: current.itemsTotal,
    messageKey: moved ? 'rfq.nego.seed.supplierConcede' : 'rfq.nego.seed.supplierHold',
    messageParams: { amount: supplierTotal },
    at: addMinutes(now, 3),
  }

  return {
    ...thread,
    // Countering re-opens the conversation: it withdraws any acceptance still standing, which is
    // what the form promises. Leaving `agreed` set would point the agreed terms at a stale version.
    status: 'active',
    agreedVersion: undefined,
    agreedBy: undefined,
    agreedAt: undefined,
    offers: [...thread.offers, buyerOffer, supplierReply],
    updatedAt: supplierReply.at,
  }
}

/**
 * Spread a VAT-inclusive target total back across the included lines, keeping each line's share of
 * the offer. This is the "Split pro-rata" the negotiation forms offer: the party types the number
 * they want to land on and the per-line prices follow, because the purchase order needs real line
 * prices — a headline total alone can't produce them (spec v1.1 change #6).
 */
export function splitProRata(lines: CounterLineInput[], targetTotalSar: number): CounterLineInput[] {
  const current = lines.reduce((sum, l) => sum + (l.included ? l.unitPriceSar * l.quantity : 0), 0)
  if (current <= 0) return lines
  // Target and line sum are both VAT-inclusive — scale directly.
  const factor = targetTotalSar / current
  return lines.map((line) =>
    line.included
      ? { ...line, unitPriceSar: Math.round(line.unitPriceSar * factor * 100) / 100 }
      : line,
  )
}

/**
 * The supplier's revised offer. Unlike a buyer counter this appends ONE version and stops — the ball
 * is now in the buyer's court, and a revision withdraws any acceptance already given.
 */
export function applySupplierCounter(thread: NegotiationThread, input: CounterInput): NegotiationThread {
  const current = thread.offers[thread.offers.length - 1]
  const currentLines = current.lines ?? []
  const now = new Date().toISOString()

  const lines: OfferLine[] = input.lines.map((l) => {
    const cur = currentLines.find((c) => c.index === l.index)
    return {
      index: l.index,
      name: cur?.name ?? '',
      unit: cur?.unit ?? '',
      quantity: l.quantity,
      unitPriceSar: l.unitPriceSar,
      included: l.included,
      deliveryDate: l.deliveryDate || input.deliveryDate,
    }
  })
  const total = offerTotal(lines)

  const offer: OfferVersion = {
    version: thread.offers.length + 1,
    by: 'supplier',
    totalSar: total,
    lines,
    deliveryDate: latestDelivery(lines, input.deliveryDate),
    paymentTermsLabel: input.paymentTermsLabel,
    paymentPreset: input.paymentPreset,
    paymentMilestones: input.paymentMilestones,
    itemsCovered: lines.filter((l) => l.included).length,
    itemsTotal: current.itemsTotal,
    message: input.message.trim() || undefined,
    messageKey: input.message.trim() ? undefined : 'rfq.nego.seed.supplierRevise',
    messageParams: input.message.trim() ? undefined : { amount: total },
    at: now,
  }

  return {
    ...thread,
    status: 'active',
    agreedVersion: undefined,
    agreedBy: undefined,
    agreedAt: undefined,
    offers: [...thread.offers, offer],
    updatedAt: now,
  }
}

/**
 * Accept the other side's latest offer. Neither side's accept issues a purchase order — the terms
 * become Agreed and the buyer confirms with the award (spec v1.1 change #3).
 */
export function acceptLatestOffer(thread: NegotiationThread, by: 'supplier' | 'buyer'): NegotiationThread {
  const accepted = lastOfferFrom(thread, by === 'supplier' ? 'buyer' : 'supplier')
  const now = new Date().toISOString()
  return {
    ...thread,
    status: 'agreed',
    agreedVersion: accepted?.version ?? thread.offers[thread.offers.length - 1]?.version,
    agreedBy: by,
    agreedAt: now,
    updatedAt: now,
  }
}

/** The most recent offer sent by one side. */
export function lastOfferFrom(thread: NegotiationThread, by: 'supplier' | 'buyer'): OfferVersion | undefined {
  for (let i = thread.offers.length - 1; i >= 0; i--) {
    if (thread.offers[i].by === by) return thread.offers[i]
  }
  return undefined
}

/** The version the two sides settled on — what the purchase order will be built from. */
export function agreedOffer(thread: NegotiationThread): OfferVersion | null {
  if (thread.status !== 'agreed') return null
  return thread.offers.find((o) => o.version === thread.agreedVersion) ?? null
}

/** Other suppliers on the same RFQ the buyer could also be negotiating with (for the side rail). */
export function otherThreads(rfq: RfqDraft, detail: RfqDetail, exceptBidId: string): NegotiationThread[] {
  return detail.bids
    .filter((b) => b.id !== exceptBidId)
    .map((b) => getThread(rfq, detail, b))
    .sort((a, b) => onTable(a).totalSar - onTable(b).totalSar)
}
