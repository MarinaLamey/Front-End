/* ────────────────────────────────────────────────────────────────────────────
 * RFQ DETAIL — derives the buyer's RFQ detail + bid-comparison view from a stored
 * RfqDraft. Everything is generated with a seed hashed from the RFQ reference, so
 * the "random" bids (per-line prices, compliance, delivery, hidden identities) are
 * STABLE across reloads. Real fields (line items, certs, notes) are used when the
 * RFQ has them; seeded/empty RFQs get plausible sample content. This is the mock
 * stand-in for the eventual quotations API.
 * ──────────────────────────────────────────────────────────────────────────── */

import { categoryLabel } from '../types'
import { allSampleItems, sampleItemsFor } from './sampleItems'
import type {
  Bid,
  BidLine,
  BidOutcome,
  BidStatus,
  LineItem,
  RfqDraft,
  SupplierBidStatus,
  SupplierIdentity,
} from '../types'

export interface RfqDetail {
  bids: Bid[]
  lineItems: LineItem[]
  certifications: string[]
  notes: string
  invitedSuppliers: number
  /** ISO — used as every line's "needed by" (we don't store per-line dates). */
  neededBy: string
  /** City the RFQ delivers to — the one locality a bidding supplier is shown before award. */
  deliverToCity: string
  /**
   * The buying organisation's registered name. Identities are exchanged AT AWARD, so this may only
   * be shown to a supplier whose own bid won — every other supplier, at every other status, sees
   * "Anonymous buyer". Never render it without checking that first.
   */
  buyerCompanyName: string
}

/** Small deterministic PRNG (mulberry32 seeded by an xmur3 hash of the key). */
export function seededRng(key: string): () => number {
  let h = 1779033703 ^ key.length
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  let a = h >>> 0
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const addDays = (iso: string, days: number) =>
  new Date((iso ? new Date(iso).getTime() : Date.now()) + days * 86_400_000).toISOString()

export const addMinutes = (iso: string, minutes: number) =>
  new Date((iso ? new Date(iso).getTime() : Date.now()) + minutes * 60_000).toISOString()

const DEFAULT_CERTS = ['ISO 9001', 'SASO Conformity', 'Mill test certificate']

const COMPANIES = [
  'Al-Rajhi Steel Industries LLC',
  'Saudi Building Materials Co.',
  'Gulf Fabrication & Trading',
  'Riyadh Industrial Supplies',
  'Najd Metals Company',
  'Eastern Steel Works LLC',
  'Arabian Reinforcement Co.',
  'Tabuk Construction Supply',
]
const CONTACTS = ['Khalid Al-Otaibi', 'Faisal Al-Harbi', 'Omar Al-Ghamdi', 'Sultan Al-Dosari', 'Yousef Al-Qahtani']
const CITIES = ['Riyadh', 'Jeddah', 'Dammam', 'Al Khobar', 'Buraydah']

/**
 * Buying organisations a SUPPLIER may be shown once awarded — the counterpart to
 * {@link COMPANIES}. Kept separate so a buyer name can never collide with a bidder's and read as
 * though one side were both, and deliberately excluding {@link DEMO_ORG}: we are the buyer on our
 * own RFQs, so seeing our own name as the anonymous counterparty would be nonsense.
 */
const BUYERS = [
  'Tamimi Contracting Group',
  'Rawabi Construction Co.',
  'Nesma Infrastructure LLC',
  'Bawani Facilities Company',
  'Sadara Projects Company',
]

/**
 * The city an RFQ delivers to — read off the saved delivery address when the buyer picked one,
 * otherwise seeded from the reference so it's stable. This is the ONE locality a supplier sees
 * about the buyer before award (spec §1: "a verified buyer with a category and a city").
 */
export function deliveryCity(rfq: RfqDraft): string {
  const saved = CITIES.find((city) => rfq.deliveryAddress.includes(city))
  if (saved) return saved
  return CITIES[Math.floor(seededRng(`${rfq.reference}:city`)() * CITIES.length)]
}

/**
 * Fill a seeded RFQ with the items it is actually asking for. Quantities are jittered ±15% off the
 * pool's representative figure so two RFQs don't read identically, while staying in the range the
 * item plausibly sells in — a 12-month maintenance contract stays 12 months, not 11,900 units.
 */
function sampleLineItems(rfq: RfqDraft, rng: () => number): LineItem[] {
  const categoryName = rfq.categories[0]?.name ?? ''
  return sampleItemsFor(categoryLabel(rfq.categories), rfq.title).map((item, i) => {
    const jitter = 0.85 + rng() * 0.3
    // Small counts (visits, months, phases) stay exact; bulk quantities round to a sane step.
    const quantity =
      item.qty <= 24 ? item.qty : Math.max(1, Math.round((item.qty * jitter) / 10) * 10)
    // Every third line carries an accepted quantity range so the demo always exercises a bounded
    // line, an unbounded one, and the supplier-side validation between them. Bounds bracket the
    // requested quantity: a supplier may under-offer to 60% but never exceed what was asked for.
    const bounded = i % 3 === 0 && quantity > 1
    return {
      name: item.name,
      specification: item.specification,
      unit: item.unit,
      categoryName,
      id: `${rfq.id}-li-${i}`,
      quantity,
      minQuantity: bounded ? Math.max(1, Math.round(quantity * 0.6)) : undefined,
      maxQuantity: bounded ? quantity : undefined,
    }
  })
}

/**
 * A stable VAT-inclusive unit price for an item. A seeded sample item carries its own representative
 * price, so a diesel generator and a rebar spacer aren't priced from the same bucket; a
 * buyer-created item has no price, and falls back to a bucket chosen by its unit.
 */
function basePrice(item: LineItem): number {
  const sample = PRICE_BY_ITEM.get(item.name)
  if (sample !== undefined) return sample

  const rng = seededRng(`price:${item.name}:${item.unit}`)
  const u = item.unit.toLowerCase()
  if (/visit|phase|report/.test(u)) return 12_000 + rng() * 60_000
  if (/month|day/.test(u)) return 2_500 + rng() * 12_000
  if (/licence|license|drop/.test(u)) return 150 + rng() * 2_000
  if (/m³|m3|drum/.test(u)) return 80 + rng() * 500
  if (/pcs|unit|pc/.test(u)) return 1.5 + rng() * 4.5
  if (/coil/.test(u)) return 40 + rng() * 16
  if (/box|bag/.test(u)) return 8 + rng() * 12
  if (/set|pallet|roll|pr/.test(u)) return 20 + rng() * 40
  return 5 + rng() * 25
}

/** Every sample item's representative price, by name — see {@link basePrice}. */
const PRICE_BY_ITEM = new Map(allSampleItems().map((item) => [item.name, item.price]))

/**
 * "Negotiating" is DERIVED, never stored: a live RFQ where the buyer has opened at least one
 * negotiation thread. Shared so the list chip and the dashboard pipeline can't disagree.
 */
export const isNegotiating = (rfq: RfqDraft) =>
  rfq.status === 'live' && Object.keys(rfq.negotiations ?? {}).length > 0

/**
 * How a bid READS once the RFQ itself has resolved. On an awarded RFQ the bids the award names read
 * Won and every other bid reads Lost; a cancelled or expired RFQ leaves every bid Lost. While the
 * RFQ is still open the bid's own stored status stands. Never mutates the bid — Won/Lost belong to
 * the RFQ's outcome, not to the bid's lifecycle.
 */
export function bidOutcome(rfq: RfqDraft, bid: Bid): BidOutcome {
  switch (rfq.status) {
    case 'awarded':
    case 'partially_awarded':
      return rfq.awards?.some((award) => award.bidId === bid.id) ? 'won' : 'lost'
    case 'cancelled':
    case 'expired':
      return 'lost'
    default:
      return bid.status
  }
}

/** How many of the RFQ's required documents a bid actually provided (single pass, no throwaway array). */
export function complianceMet(bid: Bid, certifications: string[]): number {
  let met = 0
  for (const cert of certifications) if (bid.compliance[cert]) met += 1
  return met
}

function digits(rng: () => number, n: number): string {
  let s = ''
  for (let i = 0; i < n; i++) s += Math.floor(rng() * 10)
  return s
}

function identityFor(rfq: RfqDraft, i: number, certs: string[]): SupplierIdentity {
  const g = seededRng(`${rfq.reference}:identity:${i}`)
  return {
    companyName: COMPANIES[(i + Math.floor(g() * COMPANIES.length)) % COMPANIES.length],
    cr: `10${digits(g, 8)}`,
    vat: `300${digits(g, 9)}003`,
    address: `Industrial City ${1 + Math.floor(g() * 4)}, ${CITIES[Math.floor(g() * CITIES.length)]}`,
    contactName: CONTACTS[Math.floor(g() * CONTACTS.length)],
    contactRole: g() > 0.5 ? 'Sales' : 'Business Development',
    certifications: certs,
  }
}

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** Short "24 Aug" label from an ISO date (UTC — stable regardless of the viewer's timezone). */
function shortDateLabel(iso: string): string {
  const d = new Date(iso)
  return `${d.getUTCDate()} ${MONTH_ABBR[d.getUTCMonth()]}`
}

/**
 * Deterministic status spread so the Bids inbox chips all have non-zero counts: rank by total
 * (cheapest = strongest), keep the strongest bids active (submitted/negotiating), and push the
 * weakest-ranked ones into terminal states (withdrawn/declined/expired). Purely a function of the
 * already-seeded totals — no fresh randomness, so it's stable across reloads.
 */
function assignStatusSpread(bids: Bid[]): void {
  const n = bids.length
  if (n === 0) return
  const order = bids.map((_, i) => i).sort((a, b) => bids[a].totalSar - bids[b].totalSar)

  const terminals: BidStatus[] = []
  if (n >= 3) terminals.push('withdrawn')
  if (n >= 4) terminals.push('declined')
  if (n >= 6) terminals.push('expired')

  const terminal = new Set<number>()
  terminals.forEach((status, k) => {
    const idx = order[n - 1 - k] // weakest-ranked first
    bids[idx].status = status
    terminal.add(idx)
  })

  // Remaining (stronger) bids stay active, alternating so both active chips are populated.
  let toggle = false
  for (const idx of order) {
    if (terminal.has(idx)) continue
    bids[idx].status = toggle ? 'negotiating' : 'submitted'
    toggle = !toggle
  }
}

/**
 * Re-derive each bid's headline from its own lines. Run LAST, after the status spread and the
 * partial-line injection, so a line trimmed to a short quantity is billed at that quantity and not
 * at the quantity the buyer asked for — otherwise the bid total, the compare column and the
 * supplier's own copy of the bid would disagree.
 */
function recomputeTotals(bids: Bid[]): void {
  for (const bid of bids) {
    // "Not interested" creates no bid (spec §2) — the buyer sees the decline, never a price for it.
    if (bid.status === 'declined') {
      bid.lines = bid.lines.map((line) => ({ ...line, unitPrice: null, qtyQuoted: 0 }))
      bid.unitPrices = bid.unitPrices.map(() => null)
      bid.totalSar = 0
      bid.itemsCovered = 0
      continue
    }
    const supplied = bid.lines.filter((line) => line.unitPrice !== null && line.qtyQuoted > 0)
    const subtotal = supplied.reduce((sum, line) => sum + (line.unitPrice ?? 0) * line.qtyQuoted, 0)
    // Unit prices are VAT-inclusive, so the priced line-sum IS the bid total.
    bid.totalSar = Math.round(subtotal * 100) / 100
    bid.itemsCovered = supplied.length
  }
}

/**
 * Make ONE lower-ranked, still-active bid short on a single line — a partial "q of r" quote the
 * compare screen can surface — without disturbing the strongest bid.
 */
function injectPartialLine(bids: Bid[]): void {
  if (bids.length < 2) return
  const order = bids.map((_, i) => i).sort((a, b) => bids[a].totalSar - bids[b].totalSar)
  const isActive = (b: Bid) => b.status === 'submitted' || b.status === 'negotiating'
  // Skip the strongest (rank 0); pick the next active bid that has a priced line to trim.
  const idx = order.find((i, rank) => rank > 0 && isActive(bids[i]))
  if (idx === undefined) return
  const bid = bids[idx]
  const li = bid.lines.findIndex((l) => l.unitPrice !== null && l.qtyQuoted > 0)
  if (li < 0) return
  const required = bid.lines[li].qtyRequired
  bid.lines[li] = { ...bid.lines[li], qtyQuoted: Math.max(1, Math.floor(required * 0.6)) }
}

function generateBids(rfq: RfqDraft, lineItems: LineItem[], certs: string[], neededBy: string): Bid[] {
  const rng = seededRng(`${rfq.reference}:bids`)
  const bases = lineItems.map((it) => basePrice(it))
  const rfqTerms = rfq.milestones.map((m) => m.percent).join(' / ')

  const bids: Bid[] = Array.from({ length: rfq.bids }, (_, i) => {
    const factor = 0.88 + rng() * 0.26 // supplier-wide price multiplier
    // Occasionally a bidder doesn't quote the last line item (a "Not supplying" line).
    const dropLast = i === 0 ? rng() > 0.4 : rng() > 0.85
    const unitPrices = lineItems.map((_, li) => {
      if (dropLast && li === lineItems.length - 1) return null
      return Math.round(bases[li] * factor * 100) / 100
    })
    const itemsCovered = unitPrices.filter((p) => p !== null).length
    // Unit prices are VAT-INCLUSIVE (what the supplier types on the bid form), so the priced
    // line-sum IS the bid total and nothing is added on top. The ex-VAT subtotal is divided back
    // out by `priceTotals` wherever a footer needs it, so every figure agrees to the halala.
    const totalSar =
      Math.round(
        unitPrices.reduce<number>(
          (sum, p, li) => (p === null ? sum : sum + p * lineItems[li].quantity),
          0,
        ) * 100,
      ) / 100

    // Compliance: most full; ~1 in 3 bidders miss a required doc.
    const compliance: Record<string, boolean> = {}
    const misses = rng() > 0.66 ? 1 + Math.floor(rng() * 2) : 0
    certs.forEach((cert, ci) => {
      compliance[cert] = !(misses > 0 && ci >= certs.length - misses)
    })
    const compliant = Object.values(compliance).every(Boolean)

    const counter = rng() > 0.75
    const matchPct = Math.round(
      95 - (itemsCovered < lineItems.length ? 8 : 0) - (compliant ? 0 : 12) - rng() * 6,
    )
    // Delivery is quoted against the date the BUYER asked for, not the date the RFQ opened: a
    // supplier lands a little early or (spec §6 allows it) a little late. Hanging it off the
    // creation date instead would have an old RFQ promising delivery before its own bids were sent.
    const deliveryOffset = -6 + Math.floor(rng() * 9) // −6 … +2 days around the needed-by date
    const deliveryDate = addDays(neededBy, deliveryOffset)
    const leadTimeDays = Math.max(
      1,
      Math.round((new Date(deliveryDate).getTime() - new Date(rfq.createdAt).getTime()) / 86_400_000),
    )

    // Per-line detail behind the bid: price mirrors unitPrices (null = "Not supplying"); quantity
    // is full unless a later pass trims it; lines stagger a day either side of the bid's own date.
    const lines: BidLine[] = lineItems.map((it, li) => ({
      unitPrice: unitPrices[li],
      qtyQuoted: unitPrices[li] === null ? 0 : it.quantity,
      qtyRequired: it.quantity,
      deliveryLabel: shortDateLabel(addDays(deliveryDate, (li % 3) - 1)),
    }))

    return {
      id: `${rfq.id}-bid-${i}`,
      bidder: `Supplier ${String.fromCharCode(65 + i)}`,
      status: 'submitted' as BidStatus, // finalised by assignStatusSpread below
      matchPct,
      totalSar,
      itemsCovered,
      itemsTotal: lineItems.length,
      unitPrices,
      lines,
      deliveryDate,
      leadTimeDays,
      paymentTerms: counter
        ? { kind: 'counter', label: '40 / 50 / 10' }
        : { kind: 'accepted', label: rfqTerms },
      // The offer holds until a little after the RFQ closes — long enough to be awardable.
      validUntil: addDays(rfq.closingDate || rfq.createdAt, 3 + Math.floor(rng() * 10)),
      compliance,
      negotiationRounds: 1 + Math.floor(rng() * 3),
      identity: identityFor(rfq, i, certs.filter((c) => compliance[c])),
    }
  })

  assignStatusSpread(bids)
  injectPartialLine(bids)
  recomputeTotals(bids)
  return bids
}

/** How the supplier's own lifecycle reads to the buyer, once they've actually sent something. */
const BUYER_VIEW_OF: Partial<Record<SupplierBidStatus, BidStatus>> = {
  submitted: 'submitted',
  negotiating: 'negotiating',
  withdrawn: 'withdrawn',
  declined: 'declined',
  expired: 'expired',
  // Resolved RFQs still show the bid that was in the running; the award record says who won.
  won: 'submitted',
  lost: 'submitted',
  cancelled: 'submitted',
}

/**
 * Overlay the signed-in supplier's OWN bid onto the masked bid set, so the buyer compares the real
 * thing rather than a seeded stand-in. The supplier always occupies the first slot (they are
 * "Supplier A" on this RFQ); if the RFQ has no seeded bids their bid is appended as the first one.
 * A never-sent bid (draft/invited) is not overlaid — nothing has reached the buyer yet.
 */
function overlaySupplierBid(bids: Bid[], rfq: RfqDraft, lineItems: LineItem[], certs: string[]): Bid[] {
  const record = rfq.supplierBid
  const status = record && BUYER_VIEW_OF[record.status]
  if (!record || !status) return bids

  const priced = record.lines.filter((l) => l.included && l.unitPriceSar > 0)
  const subtotal = priced.reduce((sum, l) => sum + l.unitPriceSar * l.quantity, 0)
  const seed = bids[0]
  const base: Bid = seed ?? {
    ...blankBid(rfq, lineItems, certs),
  }
  const lines: BidLine[] = lineItems.map((item, i) => {
    const line = record.lines.find((l) => l.index === i)
    const supplying = line?.included && line.unitPriceSar > 0
    return {
      unitPrice: supplying ? line.unitPriceSar : null,
      qtyQuoted: supplying ? line.quantity : 0,
      qtyRequired: item.quantity,
      deliveryLabel: shortDateLabel(line?.deliveryDate || rfq.requiredDeliveryDate || rfq.closingDate),
    }
  })
  const latestDelivery = priced
    .map((l) => l.deliveryDate)
    .sort()
    .at(-1)

  const overlaid: Bid = {
    ...base,
    status,
    totalSar: Math.round(subtotal * 100) / 100,
    itemsCovered: priced.length,
    itemsTotal: lineItems.length,
    unitPrices: lines.map((l) => l.unitPrice),
    lines,
    deliveryDate: latestDelivery || base.deliveryDate,
    validUntil: record.validUntil || base.validUntil,
    paymentTerms: { kind: record.paymentTermsKind, label: record.paymentTermsLabel },
    compliance: Object.fromEntries(
      certs.map((cert) => [cert, certificateAttached(cert, record.attachments)]),
    ),
  }
  return seed ? [overlaid, ...bids.slice(1)] : [overlaid]
}

/**
 * Does one of the attached filenames satisfy this required certification? Matched on an
 * alphanumeric-only, case-folded token so "SASO Conformity" recognises "SASO_conformity_2026.pdf"
 * — a plain prefix compare silently reported an attached certificate as missing.
 */
function certificateAttached(certification: string, attachments: string[]): boolean {
  const token = certification.toLowerCase().replace(/[^a-z0-9]/g, '')
  return attachments.some((name) => name.toLowerCase().replace(/[^a-z0-9]/g, '').includes(token))
}

/** The shell a supplier bid is overlaid onto when the RFQ has attracted no seeded bids. */
function blankBid(rfq: RfqDraft, lineItems: LineItem[], certs: string[]): Bid {
  return {
    id: `${rfq.id}-bid-0`,
    bidder: 'Supplier A',
    status: 'submitted',
    matchPct: 90,
    totalSar: 0,
    itemsCovered: 0,
    itemsTotal: lineItems.length,
    unitPrices: lineItems.map(() => null),
    lines: [],
    deliveryDate: rfq.requiredDeliveryDate || rfq.closingDate,
    leadTimeDays: 14,
    paymentTerms: { kind: 'accepted', label: rfq.milestones.map((m) => m.percent).join(' / ') },
    validUntil: rfq.closingDate,
    compliance: Object.fromEntries(certs.map((cert) => [cert, true])),
    negotiationRounds: 1,
    identity: identityFor(rfq, 0, certs),
  }
}

/** Build the full detail view for an RFQ (real data where present, sample where empty). */
export function deriveRfqDetail(rfq: RfqDraft): RfqDetail {
  const rng = seededRng(`${rfq.reference}:detail`)
  const lineItems = rfq.lineItems.length > 0 ? rfq.lineItems : sampleLineItems(rfq, rng)
  const certifications = rfq.certifications.length > 0 ? rfq.certifications : DEFAULT_CERTS
  const invitedSuppliers = Math.max(rfq.bids + 2 + Math.floor(rng() * 7), rfq.bids, 1)
  // Resolved before the bids are built: every quoted delivery date is measured against it.
  const neededBy = rfq.requiredDeliveryDate || addDays(rfq.closingDate || rfq.createdAt, 14)

  return {
    bids: overlaySupplierBid(
      generateBids(rfq, lineItems, certifications, neededBy),
      rfq,
      lineItems,
      certifications,
    ),
    lineItems,
    certifications,
    notes: rfq.acceptanceCriteria.trim(),
    invitedSuppliers,
    neededBy,
    deliverToCity: deliveryCity(rfq),
    buyerCompanyName: BUYERS[Math.floor(seededRng(`${rfq.reference}:buyer`)() * BUYERS.length)],
  }
}
