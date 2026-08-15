/* ────────────────────────────────────────────────────────────────────────────
 * SUPPLIER BID — the supplier's own side of an RFQ.
 *
 * The signed-in supplier IS "Supplier A" on every RFQ they bid on, so this module and
 * the buyer's `deriveRfqDetail` describe the SAME bid from two ends: what the supplier
 * priced here is what the buyer compares there, and the negotiation thread is shared.
 *
 * Where the supplier has actually acted, `rfq.supplierBid` is authoritative. Where they
 * haven't, the state is derived from the seeded bid so a fresh session reads as lived-in.
 * Either way the RFQ's own lifecycle wins on top: a cancelled RFQ cancels the bid, an
 * awarded one resolves it to won or lost.
 * ──────────────────────────────────────────────────────────────────────────── */

import { deriveRfqDetail, addDays } from '../detail/deriveRfqDetail'
import type { RfqDetail } from '../detail/deriveRfqDetail'
import { getThread, onTable } from '../negotiate/deriveNegotiation'
import { priceTotals } from '../vat'
import type {
  Bid,
  NegotiationThread,
  RfqDraft,
  SupplierBidLine,
  SupplierBidRecord,
  SupplierBidStatus,
} from '../types'
import { SUPPLIER_PROFILE } from './supplierProfile'

/** The supplier's own bid always sits in the first slot of the masked bid set. */
const OWN_BID_INDEX = 0

/**
 * Statuses that put a row on My Bids — everything the supplier has actually started. Declined,
 * withdrawn and expired get no tab of their own but are still reachable under All (spec §2).
 */
const ON_MY_BIDS: SupplierBidStatus[] = [
  'draft',
  'submitted',
  'negotiating',
  'declined',
  'withdrawn',
  'expired',
  'won',
  'lost',
  'cancelled',
]

/** The supplier's bid on one RFQ, resolved from the persisted record and the RFQ's lifecycle. */
export interface SupplierBidView {
  status: SupplierBidStatus
  /** The masked bid the buyer sees — null when nothing has been sent yet. */
  bid: Bid | null
  lines: SupplierBidLine[]
  subtotalSar: number
  vatSar: number
  totalSar: number
  itemsQuoted: number
  itemsTotal: number
  /** How many quoted lines are short of the requested quantity (drives the pricing footnote). */
  shortLines: number
  /** Latest delivery date across the quoted lines — the date the buyer is shown. */
  deliveryDate: string
  validUntil: string
  paymentTermsLabel: string
  paymentTermsKind: 'accepted' | 'counter'
  attachments: string[]
  submittedAt?: string
  withdrawReason?: string
  /** The shared negotiation thread, once the buyer has answered. */
  thread: NegotiationThread | null
  /** Fixed-vocabulary activity line for My Bids (spec §7) — an i18n key plus its params. */
  activityKey: string
  activityParams: Record<string, string | number>
  updatedAt: string
}

/** One row of Available RFQs / My Bids — an RFQ plus the supplier's standing on it. */
export interface SupplierRfqView {
  rfq: RfqDraft
  detail: RfqDetail
  bid: SupplierBidView
  /** In the supplier's own categories (Matched tab), as opposed to merely in their regions. */
  matched: boolean
  /** null when unmatched; otherwise whether the region matched too. */
  matchReason: 'category' | 'categoryAndRegion' | null
  /** Negative once the closing date has passed. */
  closingInDays: number
  /** Spec §4 — the badge shown in the last 48 hours. */
  closingSoon: boolean
}

/** An RFQ delivers into a region the supplier serves. An RFQ with no region set is open to all. */
function inSupplierRegions(rfq: RfqDraft): boolean {
  if (rfq.regions.length === 0) return true
  return rfq.regions.some((region) => SUPPLIER_PROFILE.regions.includes(region))
}

/** The RFQ sits in one of the supplier's registered categories (spec §4 — matched = invited). */
function inSupplierCategories(rfq: RfqDraft): boolean {
  return rfq.categories.some((category) => SUPPLIER_PROFILE.categories.includes(category.name))
}

export const daysUntil = (iso: string) =>
  iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0

/** Suppliers never see a draft or an unverified RFQ; everything published is visible. */
export function visibleToSupplier(rfq: RfqDraft): boolean {
  return rfq.status !== 'draft' && rfq.status !== 'awaiting_verification'
}

/** Ex-VAT subtotal, VAT and the VAT-inclusive total for a set of priced lines. */
export function bidTotals(lines: SupplierBidLine[]) {
  const subtotal = lines.reduce(
    (sum, line) => (line.included ? sum + line.unitPriceSar * line.quantity : sum),
    0,
  )
  return priceTotals(subtotal)
}

/**
 * Seed the bid form. An RFQ the supplier already priced comes back exactly as saved; a fresh one
 * starts from the seeded bid's own numbers (this supplier IS that bidder), so "Resume draft" and
 * "Submit bid" open the same shape.
 */
export function blankBidLines(detail: RfqDetail): SupplierBidLine[] {
  const own = detail.bids[OWN_BID_INDEX] ?? null
  return detail.lineItems.map((item, index) => {
    const line = own?.lines[index]
    const unitPrice = line?.unitPrice ?? null
    return {
      index,
      included: unitPrice != null,
      quantity: unitPrice != null ? line.qtyQuoted : item.quantity,
      unitPriceSar: unitPrice ?? 0,
      deliveryDate: own ? addDays(own.deliveryDate, index) : detail.neededBy,
    }
  })
}

/** Lines read off the persisted record, padded to the RFQ's current line count. */
function recordLines(record: SupplierBidRecord, detail: RfqDetail): SupplierBidLine[] {
  return detail.lineItems.map((item, index) => {
    const line = record.lines.find((l) => l.index === index)
    return (
      line ?? {
        index,
        included: false,
        quantity: item.quantity,
        unitPriceSar: 0,
        deliveryDate: detail.neededBy,
      }
    )
  })
}

/** The supplier won this RFQ — by the recorded award, or (unawarded seed) by holding the best bid. */
function wonHere(rfq: RfqDraft, detail: RfqDetail, own: Bid | null): boolean {
  if (!own) return false
  if (rfq.awards?.length) return rfq.awards.some((award) => award.bidId === own.id)
  const active = detail.bids.filter((b) => b.status === 'submitted' || b.status === 'negotiating')
  const best = active.slice().sort((a, b) => a.totalSar - b.totalSar)[0]
  return best?.id === own.id
}

/**
 * Resolve what the supplier's bid actually IS right now. `intent` is what the supplier last chose
 * (or what the seed implies); the RFQ's lifecycle then overrides it — a cancelled RFQ cancels the
 * bid, a resolved RFQ turns it into won or lost, and a closing date passing expires an unsent draft.
 */
function resolveStatus(
  rfq: RfqDraft,
  detail: RfqDetail,
  own: Bid | null,
  intent: SupplierBidStatus,
  validUntil: string,
): SupplierBidStatus {
  // The supplier's own exits are final and outlive whatever the RFQ does next.
  if (intent === 'declined' || intent === 'withdrawn') return intent
  if (rfq.status === 'cancelled') return intent === 'invited' ? 'invited' : 'cancelled'

  const resolved = rfq.status === 'awarded' || rfq.status === 'partially_awarded'
  const finished = resolved || rfq.status === 'expired' || daysUntil(rfq.closingDate) < 0

  if (finished) {
    if (intent === 'invited') return 'invited'
    if (intent === 'draft') return 'expired'
    return wonHere(rfq, detail, own) && resolved ? 'won' : 'lost'
  }

  // Spec §6: the supplier's own validity date is the other thing that expires a bid. A live RFQ
  // with a lapsed offer on it is expired, not still awaiting review.
  const sent = intent === 'submitted' || intent === 'negotiating'
  if (sent && validUntil && new Date(validUntil).getTime() < Date.now()) return 'expired'

  return intent
}

/**
 * No persisted record means this supplier has not bid: the RFQ may well have attracted other
 * bidders, but none of them is them. Anything they HAVE done is seeded explicitly in `rfqApi`, so
 * "invited" here is a statement of fact rather than a fallback guess.
 */
function seededIntent(): SupplierBidStatus {
  return 'invited'
}

/** The fixed set of activity phrases My Bids is allowed to print (spec §7). */
function activityFor(
  status: SupplierBidStatus,
  thread: NegotiationThread | null,
): { activityKey: string; activityParams: Record<string, string | number> } {
  const key = (name: string) => ({ activityKey: `rfq.supplier.activity.${name}`, activityParams: {} })
  switch (status) {
    case 'draft':
      return key('draftSaved')
    case 'submitted':
      return key('awaitingReview')
    case 'negotiating':
      if (thread?.status === 'agreed') {
        return key(thread.agreedBy === 'supplier' ? 'youAccepted' : 'buyerAccepted')
      }
      return key(
        thread && thread.offers[thread.offers.length - 1]?.by === 'buyer' ? 'buyerCountered' : 'youCountered',
      )
    case 'won':
      return key('youWereAwarded')
    case 'lost':
      return key('awardedElsewhere')
    case 'withdrawn':
      return key('youWithdrew')
    case 'declined':
      return key('youDeclined')
    case 'expired':
      return key('bidExpired')
    case 'cancelled':
      return key('rfqCancelled')
    case 'invited':
      return key('notBidYet')
  }
}

/**
 * Once the RFQ itself has resolved, the conversation has too — a thread left reading "awaiting
 * buyer" on an RFQ that was awarded elsewhere would put a turn on the supplier that isn't theirs.
 */
function closeIfResolved(thread: NegotiationThread, status: SupplierBidStatus): NegotiationThread {
  if (status === 'won') return { ...thread, status: 'awarded' }
  const dead = status === 'lost' || status === 'expired' || status === 'cancelled' || status === 'withdrawn'
  return dead ? { ...thread, status: 'ended' } : thread
}

/** The supplier's standing on one RFQ. */
export function deriveSupplierBid(rfq: RfqDraft, detail: RfqDetail): SupplierBidView {
  const own = detail.bids[OWN_BID_INDEX] ?? null
  const record = rfq.supplierBid ?? null
  const validUntil = record?.validUntil || own?.validUntil || rfq.closingDate
  const status = resolveStatus(rfq, detail, own, record?.status ?? seededIntent(), validUntil)

  // A decline creates no bid (spec §2) and an untouched RFQ has none yet — neither carries a price.
  const priceless = status === 'declined' || status === 'invited'
  const lines =
    record && !priceless
      ? recordLines(record, detail)
      : detail.lineItems.map((item, index) => ({
          index,
          included: false,
          quantity: item.quantity,
          unitPriceSar: 0,
          deliveryDate: detail.neededBy,
        }))

  const quoted = lines.filter((line) => line.included && line.unitPriceSar > 0)
  const { subtotal, vat, total } = bidTotals(quoted)
  // "Sent" = something actually reached the buyer. A draft never left, and a decline is not a bid.
  const sent = !priceless && status !== 'draft'
  // A conversation only exists once the BUYER has answered — a bid awaiting review has none.
  const answered = own != null && (rfq.negotiations?.[own.id] != null || status === 'negotiating')
  const thread = own && sent && answered ? closeIfResolved(getThread(rfq, detail, own), status) : null

  return {
    status,
    bid: sent ? own : null,
    lines,
    subtotalSar: subtotal,
    vatSar: vat,
    totalSar: total,
    itemsQuoted: quoted.length,
    itemsTotal: detail.lineItems.length,
    shortLines: quoted.filter((line) => line.quantity < detail.lineItems[line.index].quantity).length,
    deliveryDate:
      quoted
        .map((line) => line.deliveryDate)
        .sort()
        .at(-1) ??
      own?.deliveryDate ??
      detail.neededBy,
    validUntil,
    paymentTermsLabel: record?.paymentTermsLabel || own?.paymentTerms.label || '',
    paymentTermsKind: record?.paymentTermsKind ?? own?.paymentTerms.kind ?? 'accepted',
    attachments: record?.attachments ?? SUPPLIER_PROFILE.savedDocuments.map((doc) => doc.name),
    submittedAt: record?.submittedAt ?? (sent ? addDays(rfq.createdAt, 1) : undefined),
    withdrawReason: record?.withdrawReason,
    thread,
    ...activityFor(status, thread),
    updatedAt: record?.updatedAt ?? rfq.updatedAt,
  }
}

/** One RFQ resolved into the row both supplier lists render from. */
export function toSupplierView(rfq: RfqDraft): SupplierRfqView {
  const detail = deriveRfqDetail(rfq)
  const bid = deriveSupplierBid(rfq, detail)
  const matched = inSupplierCategories(rfq)
  const closingInDays = daysUntil(rfq.closingDate)
  return {
    rfq,
    detail,
    bid,
    matched,
    matchReason: matched ? (inSupplierRegions(rfq) ? 'categoryAndRegion' : 'category') : null,
    closingInDays,
    closingSoon: rfq.status === 'live' && closingInDays > 0 && closingInDays <= 2,
  }
}

/** Every published RFQ, soonest-closing first — the pool both supplier lists filter down from. */
export function supplierViews(rfqs: RfqDraft[]): SupplierRfqView[] {
  return rfqs
    .filter(visibleToSupplier)
    .map(toSupplierView)
    .sort((a, b) => a.rfq.closingDate.localeCompare(b.rfq.closingDate))
}

/** Still open to bids — what "Available RFQs" means (spec §4). */
export function isOpenToBids(view: SupplierRfqView): boolean {
  return (
    (view.rfq.status === 'live' || view.rfq.status === 'partially_awarded') && view.closingInDays >= 0
  )
}

/** The supplier has a bid worth listing on My Bids. */
export function hasBidRecord(view: SupplierRfqView): boolean {
  return ON_MY_BIDS.includes(view.bid.status)
}

/** The supplier's latest position in a negotiation — what the buyer is looking at. */
export function supplierOnTable(thread: NegotiationThread) {
  return onTable(thread)
}
