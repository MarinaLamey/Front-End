/* ────────────────────────────────────────────────────────────────────────────
 * SEED AUDIT — is the demo data still consistent and logical?
 *
 * The mock seed is generated, not hand-written, so a change to pricing, dates or
 * status derivation can quietly put a purchase order before the bid it accepts, or
 * leave a bid status unreachable from a fresh session. This walks every seeded RFQ
 * from BOTH sides — the buyer's masked bid set and the supplier's own view of the
 * same bid — and asserts they agree and that each record makes sense on its own.
 *
 * Run with `npm run audit:seed`. Exits non-zero when anything fails, so it can gate CI.
 *
 * Two things it deliberately reports rather than asserts:
 *  · COVERAGE — which statuses a fresh session can actually reach. A status with no
 *    RFQ behind it is a screen nobody can test.
 *  · Invariants only cover what someone thought to check. Add to INVARIANTS below
 *    when a new class of nonsense turns up; don't rely on a clean run meaning "correct".
 * ──────────────────────────────────────────────────────────────────────────── */

import { rfqApi } from '@/features/rfq/services/rfqApi'
import { deriveRfqDetail } from '@/features/rfq/detail/deriveRfqDetail'
import { deriveSupplierBid } from '@/features/rfq/supplier/deriveSupplierBid'
import { getThread } from '@/features/rfq/negotiate/deriveNegotiation'
import { SUPPLIER_PROFILE } from '@/features/rfq/supplier/supplierProfile'
import { withVat } from '@/features/rfq/vat'
import type { BidStatus, RfqDraft, RfqStatus, SupplierBidStatus } from '@/features/rfq/types'

const SUPPLIER_STATUSES: SupplierBidStatus[] = [
  'invited', 'draft', 'submitted', 'negotiating', 'declined',
  'withdrawn', 'expired', 'won', 'lost', 'cancelled',
]
const BUYER_BID_STATUSES: BidStatus[] = ['submitted', 'negotiating', 'withdrawn', 'declined', 'expired']
const NEGOTIATION_STATUSES = ['active', 'agreed', 'ended', 'awarded']
const RFQ_STATUSES: RfqStatus[] = [
  'draft', 'awaiting_verification', 'live', 'awarded', 'partially_awarded', 'cancelled', 'expired',
]

interface Failure {
  invariant: string
  where: string
  detail: string
}

const day = (iso: string) => (iso ? iso.slice(0, 10) : '—')
const near = (a: number, b: number, tol = 0.02) => Math.abs(a - b) <= tol

export async function runSeedAudit(): Promise<number> {
  const rfqs: RfqDraft[] = await rfqApi.listRfqs()
  const failures: Failure[] = []
  const seen = {
    supplier: new Map<string, string[]>(),
    buyerBid: new Map<string, number>(),
    negotiation: new Map<string, number>(),
    rfq: new Map<string, number>(),
  }

  for (const rfq of rfqs) {
    const at = rfq.reference
    const fail = (invariant: string, detail: string) => failures.push({ invariant, where: at, detail })

    seen.rfq.set(rfq.status, (seen.rfq.get(rfq.status) ?? 0) + 1)

    const detail = deriveRfqDetail(rfq)
    const bid = deriveSupplierBid(rfq, detail)
    const own = detail.bids[0] ?? null
    const award = rfq.awards?.[0]

    seen.supplier.set(bid.status, [...(seen.supplier.get(bid.status) ?? []), at])
    for (const b of detail.bids) seen.buyerBid.set(b.status, (seen.buyerBid.get(b.status) ?? 0) + 1)
    if (bid.thread) seen.negotiation.set(bid.thread.status, (seen.negotiation.get(bid.thread.status) ?? 0) + 1)

    // A pre-publication RFQ has reached no supplier, so only its own status is meaningful.
    if (rfq.status === 'draft' || rfq.status === 'awaiting_verification') continue

    /* ── money ─────────────────────────────────────────────────────────────── */
    if (own && bid.bid && !near(bid.totalSar, own.totalSar, 1)) {
      fail('money · both sides quote the same bid', `supplier ${bid.totalSar.toFixed(2)} vs buyer ${own.totalSar.toFixed(2)}`)
    }
    if (!near(withVat(bid.subtotalSar), bid.totalSar)) {
      fail('money · subtotal plus VAT equals the total', `${bid.subtotalSar} + VAT != ${bid.totalSar}`)
    }
    if (award) {
      if (award.agreedTotalSar <= 0) fail('money · an award has a real value', `agreed total ${award.agreedTotalSar}`)
      if (award.savedVsOriginalSar < 0) fail('money · negotiation never costs the buyer more', `saving ${award.savedVsOriginalSar}`)
    }

    /* ── logic ─────────────────────────────────────────────────────────────── */
    if ((bid.status === 'declined' || bid.status === 'invited') && bid.itemsQuoted > 0) {
      fail('logic · a decline is not a priced bid', `${bid.status} with ${bid.itemsQuoted} lines priced`)
    }
    if (bid.status === 'won' && !(rfq.status === 'awarded' || rfq.status === 'partially_awarded')) {
      fail('logic · a win implies an awarded RFQ', `bid won but RFQ is ${rfq.status}`)
    }
    if (bid.status === 'won' && award && own && award.bidId !== own.id) {
      fail('logic · a win implies the award names this bid', `award names ${award.bidId}`)
    }
    if (bid.status === 'lost' && rfq.status === 'live') fail('logic · a loss implies the RFQ has closed', 'RFQ still live')
    if (bid.status === 'cancelled' && rfq.status !== 'cancelled') {
      fail('logic · a cancelled bid implies a cancelled RFQ', `RFQ is ${rfq.status}`)
    }
    if (bid.status === 'draft' && rfq.status !== 'live') fail('logic · a draft implies a live RFQ', `RFQ is ${rfq.status}`)
    if (bid.status === 'withdrawn' && !(bid.withdrawReason ?? '').trim()) {
      fail('logic · a withdrawal carries the reason the buyer is shown', 'no reason recorded')
    }
    if (rfq.status === 'live' && new Date(rfq.closingDate).getTime() < Date.now()) {
      fail('logic · a live RFQ is still open', `closed ${day(rfq.closingDate)}`)
    }
    if (award) {
      const covers = award.unsourcedItems.length === 0
      if (rfq.status === 'awarded' && !covers) {
        fail('logic · the RFQ status matches what the award covers', `Awarded but ${award.unsourcedItems.length} unsourced`)
      }
      if (rfq.status === 'partially_awarded' && covers) {
        fail('logic · the RFQ status matches what the award covers', 'Partially awarded but everything is covered')
      }
      if (award.lineIndexes.length !== award.itemsCovered) {
        fail('logic · the award covers the lines it claims', `${award.lineIndexes.length} indexes vs ${award.itemsCovered}`)
      }
    }

    /* ── time ──────────────────────────────────────────────────────────────── */
    const submitted = bid.submittedAt ?? ''
    if (submitted && submitted < rfq.createdAt) {
      fail('time · a bid follows the RFQ that invited it', `submitted ${day(submitted)} < opened ${day(rfq.createdAt)}`)
    }
    if (submitted && bid.validUntil && bid.validUntil < submitted) {
      fail('time · an offer is valid after it is sent', `valid to ${day(bid.validUntil)} < sent ${day(submitted)}`)
    }
    if (award && submitted && award.awardedAt < submitted) {
      fail('time · an award follows the bid it accepts', `awarded ${day(award.awardedAt)} < submitted ${day(submitted)}`)
    }
    if (bid.bid && submitted && bid.deliveryDate < submitted) {
      fail('time · delivery follows the offer promising it', `delivers ${day(bid.deliveryDate)} < offered ${day(submitted)}`)
    }
    if (award && award.deliveryDate < award.awardedAt) {
      fail('time · a purchase order delivers after it is issued', `delivers ${day(award.deliveryDate)} < issued ${day(award.awardedAt)}`)
    }

    /* ── quantities ────────────────────────────────────────────────────────── */
    for (const b of detail.bids) {
      b.lines.forEach((line, i) => {
        if (line.qtyQuoted > line.qtyRequired) {
          fail('quantity · nobody quotes more than was asked for', `${b.bidder} line ${i + 1}: ${line.qtyQuoted} of ${line.qtyRequired}`)
        }
        if (line.qtyRequired !== detail.lineItems[i]?.quantity) {
          fail('quantity · required quantities match the RFQ', `${b.bidder} line ${i + 1}`)
        }
      })
      if (b.itemsCovered > b.itemsTotal) fail('quantity · coverage never exceeds the line count', b.bidder)
    }

    /* ── identity ──────────────────────────────────────────────────────────── */
    if (detail.bids.length !== rfq.bids) {
      fail('identity · the bid count matches the bids on record', `rfq.bids=${rfq.bids} vs ${detail.bids.length} derived`)
    }
    if (bid.bid && bid.bid.bidder !== 'Supplier A') {
      fail('identity · the signed-in supplier is Supplier A', `is ${bid.bid.bidder}`)
    }

    /* ── compliance ────────────────────────────────────────────────────────── */
    if (bid.bid && bid.status !== 'declined') {
      for (const cert of detail.certifications) {
        const attached = bid.attachments.some((name) =>
          SUPPLIER_PROFILE.savedDocuments.some((d) => d.name === name && d.certifies === cert),
        )
        const shown = bid.bid.compliance[cert]
        if (attached !== shown) {
          fail('compliance · the buyer sees exactly what was attached', `"${cert}" attached=${attached} shown=${shown}`)
        }
      }
    }

    /* ── negotiation ───────────────────────────────────────────────────────── */
    for (const b of detail.bids) {
      if (!rfq.negotiations?.[b.id] && b.status !== 'negotiating') continue
      const thread = getThread(rfq, detail, b)
      for (let i = 1; i < thread.offers.length; i++) {
        if (thread.offers[i].at < thread.offers[i - 1].at) {
          fail('negotiation · offers run in order', `${b.bidder} v${i + 1} predates v${i}`)
        }
      }
      if (thread.offers[0].at < rfq.createdAt) {
        fail('negotiation · the first offer follows the RFQ', `${b.bidder} v1 ${day(thread.offers[0].at)}`)
      }
      for (const offer of thread.offers) {
        const lines = (offer.lines ?? []).reduce((s, l) => s + (l.included ? l.unitPriceSar * l.quantity : 0), 0)
        if (!near(withVat(lines), offer.totalSar, 2)) {
          fail('negotiation · an offer totals its own lines', `${b.bidder} v${offer.version}: lines ${withVat(lines).toFixed(2)} vs ${offer.totalSar.toFixed(2)}`)
        }
        if (offer.deliveryDate && offer.deliveryDate < offer.at) {
          fail('negotiation · an offer delivers after it is sent', `${b.bidder} v${offer.version}`)
        }
      }
      if (thread.status === 'agreed' && thread.agreedVersion == null) {
        fail('negotiation · agreed terms name their version', b.bidder)
      }
      if (thread.agreedVersion != null && !thread.offers.some((o) => o.version === thread.agreedVersion)) {
        fail('negotiation · the agreed version exists in the thread', `v${thread.agreedVersion}`)
      }
    }
  }

  return report(rfqs.length, failures, seen)
}

/** Print the coverage table and any failures; return the process exit code. */
function report(
  rfqCount: number,
  failures: Failure[],
  seen: {
    supplier: Map<string, string[]>
    buyerBid: Map<string, number>
    negotiation: Map<string, number>
    rfq: Map<string, number>
  },
): number {
  const gaps: string[] = []
  console.log(`\nSeed audit · ${rfqCount} RFQs\n`)
  console.log('COVERAGE — a status with nothing behind it is a screen nobody can test')

  const line = (label: string, present: number, total: number, missing: string[]) => {
    if (missing.length) gaps.push(`${label}: ${missing.join(', ')}`)
    const mark = missing.length ? '✗' : '✓'
    console.log(`  ${mark} ${label.padEnd(16)} ${String(present).padStart(2)} of ${total}${missing.length ? `   missing: ${missing.join(', ')}` : ''}`)
  }

  const missingFrom = <T extends string>(all: T[], have: Map<string, unknown>) => all.filter((s) => !have.has(s))
  line('supplier bid', seen.supplier.size, SUPPLIER_STATUSES.length, missingFrom(SUPPLIER_STATUSES, seen.supplier))
  line('buyer bid', seen.buyerBid.size, BUYER_BID_STATUSES.length, missingFrom(BUYER_BID_STATUSES, seen.buyerBid))
  line('negotiation', seen.negotiation.size, NEGOTIATION_STATUSES.length, missingFrom(NEGOTIATION_STATUSES, seen.negotiation))
  line('RFQ', seen.rfq.size, RFQ_STATUSES.length, missingFrom(RFQ_STATUSES, seen.rfq))

  console.log('\n  supplier bids by status:')
  for (const status of SUPPLIER_STATUSES) {
    const refs = seen.supplier.get(status) ?? []
    console.log(`    ${status.padEnd(12)} ${String(refs.length).padStart(2)}  ${refs.join(', ')}`)
  }

  console.log('')
  if (failures.length === 0) {
    console.log('INVARIANTS — all pass\n')
  } else {
    console.log(`INVARIANTS — ${failures.length} failing\n`)
    const byInvariant = new Map<string, Failure[]>()
    for (const f of failures) byInvariant.set(f.invariant, [...(byInvariant.get(f.invariant) ?? []), f])
    for (const [invariant, list] of byInvariant) {
      console.log(`  ✗ ${invariant}  (${list.length})`)
      for (const f of list.slice(0, 6)) console.log(`      ${f.where}  ${f.detail}`)
      if (list.length > 6) console.log(`      … and ${list.length - 6} more`)
    }
    console.log('')
  }

  if (gaps.length) console.log(`COVERAGE GAPS\n  ${gaps.join('\n  ')}\n`)

  const ok = failures.length === 0 && gaps.length === 0
  console.log(ok ? 'PASS\n' : 'FAIL\n')
  return ok ? 0 : 1
}
