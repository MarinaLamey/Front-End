/* ────────────────────────────────────────────────────────────────────────────
 * RFQ DETAIL — derives the buyer's RFQ detail view (bids + a complete requested-
 * items / compliance body) from a stored RfqDraft. Everything is generated with a
 * seed hashed from the RFQ reference, so the "random" bids and sample content are
 * STABLE across reloads. Real fields (line items, certs, notes) are used when the
 * RFQ has them; seeded/empty RFQs get plausible sample content so the page never
 * looks half-empty. This is the mock stand-in for the eventual quotations API.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { Bid, BidStatus, LineItem, RfqDraft } from '../types'

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
function seededRng(key: string): () => number {
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

const addDays = (iso: string, days: number) =>
  new Date((iso ? new Date(iso).getTime() : Date.now()) + days * 86_400_000).toISOString()

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

function sampleLineItems(rfq: RfqDraft, rng: () => number): LineItem[] {
  const key = `${rfq.category} ${rfq.title}`.toLowerCase()
  const pool = /steel|construction|cement|building|rebar|metal/.test(key)
    ? CONSTRUCTION_ITEMS
    : GENERIC_ITEMS
  return pool.map((item, i) => ({
    ...item,
    id: `${rfq.id}-li-${i}`,
    quantity: (Math.floor(rng() * 45) + 5) * 100, // 500–5000, tidy round numbers
  }))
}

function generateBids(rfq: RfqDraft, itemsTotal: number): Bid[] {
  const rng = seededRng(`${rfq.reference}:bids`)
  const base = rfq.budget > 0 ? rfq.budget * 0.2 : 90_000 + Math.floor(rng() * 25_000)
  return Array.from({ length: rfq.bids }, (_, i) => {
    const totalSar = Math.round((base * (0.9 + rng() * 0.28)) / 10) * 10
    const status: BidStatus = rng() > 0.5 ? 'negotiating' : 'submitted'
    return {
      id: `${rfq.id}-bid-${i}`,
      bidder: `Supplier ${String.fromCharCode(65 + i)}`,
      totalSar,
      itemsCovered: rng() > 0.35 ? itemsTotal : Math.max(itemsTotal - 1, 1),
      itemsTotal,
      deliveryDate: addDays(rfq.createdAt, 10 + Math.floor(rng() * 16)),
      status,
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
    bids: generateBids(rfq, lineItems.length),
    lineItems,
    certifications,
    notes: rfq.acceptanceCriteria.trim(),
    invitedSuppliers,
    neededBy: rfq.requiredDeliveryDate || rfq.closingDate || addDays(rfq.createdAt, 20),
  }
}
