/* ────────────────────────────────────────────────────────────────────────────
 * RFQ DETAIL — derives the buyer's RFQ detail + bid-comparison view from a stored
 * RfqDraft. Everything is generated with a seed hashed from the RFQ reference, so
 * the "random" bids (per-line prices, compliance, delivery, hidden identities) are
 * STABLE across reloads. Real fields (line items, certs, notes) are used when the
 * RFQ has them; seeded/empty RFQs get plausible sample content. This is the mock
 * stand-in for the eventual quotations API.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { Bid, BidStatus, LineItem, RfqDraft, SupplierIdentity } from '../types'

export interface RfqDetail {
  bids: Bid[]
  lineItems: LineItem[]
  certifications: string[]
  notes: string
  invitedSuppliers: number
  /** ISO — used as every line's "needed by" (we don't store per-line dates). */
  neededBy: string
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

const CONSTRUCTION_ITEMS: Omit<LineItem, 'id' | 'quantity'>[] = [
  { name: 'Steel rebar 12mm', specification: 'ASTM A615 Grade 60', unit: 'pcs' },
  { name: 'Steel rebar 16mm', specification: 'ASTM A615 Grade 60', unit: 'pcs' },
  { name: 'Steel rebar 20mm', specification: 'ASTM A615 Grade 60', unit: 'pcs' },
  { name: 'Binding wire 1.6mm', specification: 'Galvanised, 25kg coil', unit: 'coil' },
  { name: 'Rebar spacers', specification: 'Plastic, 25mm cover', unit: 'box' },
]
const GENERIC_ITEMS: Omit<LineItem, 'id' | 'quantity'>[] = [
  { name: 'Primary supply', specification: 'Per attached spec sheet', unit: 'units' },
  { name: 'Secondary supply', specification: 'Grade A', unit: 'units' },
  { name: 'Consumables pack', specification: 'Standard issue', unit: 'box' },
  { name: 'Spare parts kit', specification: 'OEM', unit: 'set' },
  { name: 'Installation accessories', specification: 'Complete set', unit: 'set' },
]

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

function sampleLineItems(rfq: RfqDraft, rng: () => number): LineItem[] {
  const key = `${rfq.category} ${rfq.title}`.toLowerCase()
  const pool = /steel|construction|cement|building|rebar|metal/.test(key) ? CONSTRUCTION_ITEMS : GENERIC_ITEMS
  return pool.map((item, i) => ({
    ...item,
    id: `${rfq.id}-li-${i}`,
    quantity: (Math.floor(rng() * 45) + 5) * 100,
  }))
}

/** A stable base unit price per item, bucketed by unit so it reads plausibly. */
function basePrice(item: LineItem): number {
  const rng = seededRng(`price:${item.name}:${item.unit}`)
  const u = item.unit.toLowerCase()
  if (/pcs|unit|pc/.test(u)) return 1.5 + rng() * 4.5
  if (/coil/.test(u)) return 40 + rng() * 16
  if (/box|bag/.test(u)) return 8 + rng() * 12
  if (/set|pallet|roll/.test(u)) return 20 + rng() * 40
  return 5 + rng() * 25
}

function digits(rng: () => number, n: number): string {
  let s = ''
  for (let i = 0; i < n; i++) s += Math.floor(rng() * 10)
  return s
}

function identityFor(rfq: RfqDraft, i: number, certs: string[], rng: () => number): SupplierIdentity {
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

function generateBids(rfq: RfqDraft, lineItems: LineItem[], certs: string[]): Bid[] {
  const rng = seededRng(`${rfq.reference}:bids`)
  const bases = lineItems.map((it) => basePrice(it))
  const rfqTerms = rfq.milestones.map((m) => m.percent).join(' / ')

  return Array.from({ length: rfq.bids }, (_, i) => {
    const factor = 0.88 + rng() * 0.26 // supplier-wide price multiplier
    // Occasionally a bidder doesn't quote the last line item.
    const dropLast = i === 0 ? rng() > 0.4 : rng() > 0.85
    const unitPrices = lineItems.map((_, li) => {
      if (dropLast && li === lineItems.length - 1) return null
      return Math.round(bases[li] * factor * 100) / 100
    })
    const itemsCovered = unitPrices.filter((p) => p !== null).length
    const subtotal = unitPrices.reduce(
      (sum, p, li) => (p === null ? sum : sum + p * lineItems[li].quantity),
      0,
    )
    const totalSar = Math.round((subtotal * 1.15) / 10) * 10 // VAT 15%, tidy to nearest 10

    // Compliance: most full; ~1 in 3 bidders miss a required doc.
    const compliance: Record<string, boolean> = {}
    const misses = rng() > 0.66 ? 1 + Math.floor(rng() * 2) : 0
    certs.forEach((cert, ci) => {
      compliance[cert] = !(misses > 0 && ci >= certs.length - misses)
    })
    const compliant = Object.values(compliance).every(Boolean)

    const leadTimeDays = 10 + Math.floor(rng() * 7)
    const counter = rng() > 0.75
    const matchPct = Math.round(
      95 - (itemsCovered < lineItems.length ? 8 : 0) - (compliant ? 0 : 12) - rng() * 6,
    )

    return {
      id: `${rfq.id}-bid-${i}`,
      bidder: `Supplier ${String.fromCharCode(65 + i)}`,
      status: (rng() > 0.5 ? 'negotiating' : 'submitted') as BidStatus,
      matchPct,
      totalSar,
      itemsCovered,
      itemsTotal: lineItems.length,
      unitPrices,
      deliveryDate: addDays(rfq.createdAt, leadTimeDays),
      leadTimeDays,
      paymentTerms: counter
        ? { kind: 'counter', label: '40 / 50 / 10' }
        : { kind: 'accepted', label: rfqTerms },
      validUntil: addDays(rfq.createdAt, 12 + Math.floor(rng() * 8)),
      compliance,
      negotiationRounds: 1 + Math.floor(rng() * 3),
      identity: identityFor(rfq, i, certs.filter((c) => compliance[c]), rng),
    }
  })
}

/** Build the full detail view for an RFQ (real data where present, sample where empty). */
export function deriveRfqDetail(rfq: RfqDraft): RfqDetail {
  const rng = seededRng(`${rfq.reference}:detail`)
  const lineItems = rfq.lineItems.length > 0 ? rfq.lineItems : sampleLineItems(rfq, rng)
  const certifications = rfq.certifications.length > 0 ? rfq.certifications : DEFAULT_CERTS
  const invitedSuppliers = Math.max(rfq.bids + 2 + Math.floor(rng() * 7), rfq.bids, 1)

  return {
    bids: generateBids(rfq, lineItems, certifications),
    lineItems,
    certifications,
    notes: rfq.acceptanceCriteria.trim(),
    invitedSuppliers,
    neededBy: rfq.requiredDeliveryDate || rfq.closingDate || addDays(rfq.createdAt, 20),
  }
}
