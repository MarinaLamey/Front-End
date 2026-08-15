/* ────────────────────────────────────────────────────────────────────────────
 * RFQ API — mock-first seam for the Create-RFQ flow.
 *
 * localStorage-backed so drafts survive reloads and the list reflects submissions,
 * with artificial latency so the UI exercises its loading/optimistic paths. Swapping
 * to the real BFF is a body change here — the contract (return shapes) stays put.
 *
 * Static reference lists (categories, regions, certifications, units) live in i18n as
 * localisable arrays, not here — this seam only owns dynamic data: saved addresses and
 * the persisted RFQ records.
 * ──────────────────────────────────────────────────────────────────────────── */

import { presetMilestones } from '../create/paymentRules'
import { awardStatusFor, buildAward } from '../detail/award'
import { addDays, deriveRfqDetail } from '../detail/deriveRfqDetail'
import { deriveThread } from '../negotiate/deriveNegotiation'
import { blankBidLines } from '../supplier/deriveSupplierBid'
import { SUPPLIER_PROFILE } from '../supplier/supplierProfile'
import { categoryTypeOf } from '../types'
import type {
  Bid,
  LineInputMethod,
  NegotiationThread,
  OrderMessage,
  RfqAddress,
  RfqAward,
  RfqCategory,
  RfqDraft,
  RfqOutcome,
  RfqStatus,
  SupplierBidRecord,
  SupplierBidStatus,
} from '../types'

// v5: status model renamed (`open`→`live`, `closed` removed, `partially_awarded`/`expired` added)
// and RFQ records carry `splitAwardAllowed`; drop older-schema records.
// v6: demo seed adds awaiting_verification RFQs (+ a plain-Live vs Negotiating pair); re-seed to pick them up.
// v7: "Negotiating" now means the buyer has OPENED a negotiation (persisted thread) — Live RFQs with
// bids stay amendable; RFQ-0141 is seeded mid-negotiation as the Negotiating example.
// v8: bid totals became VAT-inclusive and RFQ records carry the supplier's own bid.
// v9: the supplier's bids are seeded explicitly (SUPPLIER_BIDS) rather than inferred from the
// anonymous bid set, awards are dated after the bids they accept, and three RFQs were added — so
// every bid, negotiation and RFQ status is reachable from a fresh session. Re-seed to pick it up.
// v10: the bidding window is an explicit buyer-set start AND end (`openingDate` + `closingDate`),
// never derived from the publication moment, and a cancelled RFQ persists the reason it was
// cancelled with. Re-seed to pick it up.
const STORE_KEY = 'miproc.rfqs.v10'
const LATENCY = 400
const REFERENCE_SEED = 231

const ADDRESSES: RfqAddress[] = [
  { id: 'addr_hq', label: 'Riyadh, Al Olaya District, King Fahd Rd' },
  { id: 'addr_jeddah', label: 'Jeddah, Al Rawdah District, Prince Sultan Rd' },
]

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY))
}

function id(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}_${crypto.randomUUID()}`
  return `${prefix}_${Date.now()}`
}

function readStore(): RfqDraft[] {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as RfqDraft[]) : []
  } catch {
    return []
  }
}

function writeStore(records: RfqDraft[]): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(records))
  } catch {
    /* storage unavailable — ignore */
  }
}

/** `RFQ-2026-0231`, incrementing from the seed as records accumulate. */
function nextReference(): string {
  const year = new Date().getFullYear()
  const sequence = REFERENCE_SEED + readStore().length
  return `RFQ-${year}-${String(sequence).padStart(4, '0')}`
}

/** The constant, non-identifying defaults shared by a blank draft and every seeded record. */
function draftDefaults() {
  return {
    bids: 0,
    categories: [] as RfqCategory[],
    title: '',
    budget: 0,
    lineInputMethod: 'manual' as LineInputMethod,
    lineItems: [],
    deliverToCompanyAddress: true,
    deliveryAddress: '',
    requiredDeliveryDate: '',
    openingDate: '',
    closingDate: '',
    splitAwardAllowed: false,
    partialDeliveryAllowed: true,
    partialBidsAllowed: true,
    minItemsPerBid: 1,
    // 0 = "all" — a single bid may cover every line item unless the buyer caps it.
    maxItemsPerBid: 0,
    paymentPreset: 'staged' as const,
    milestones: presetMilestones('staged'),
    acceptanceCriteria: '',
    specDocumentName: '',
    certifications: [] as string[],
    minimumWarranty: '',
    regions: [] as string[],
    favouritesOnly: false,
  }
}

/** A fresh, rule-valid draft the wizard starts from (client-side; not yet persisted). */
export function createBlankDraft(): RfqDraft {
  const now = new Date().toISOString()
  return {
    id: id('rfq'),
    reference: nextReference(),
    status: 'draft',
    ...draftDefaults(),
    createdAt: now,
    updatedAt: now,
  }
}

/** Maps a terminal outcome to the status the record is stored under. */
function statusFor(outcome: RfqOutcome): RfqStatus {
  switch (outcome) {
    case 'published':
      return 'live'
    // Unverified buyers can't publish — the RFQ waits under review and auto-publishes on approval.
    case 'verify_to_publish':
      return 'awaiting_verification'
    case 'draft_saved':
      return 'draft'
  }
}

/**
 * Move every conversation to where the award leaves it. A won bid's thread becomes `awarded`; the
 * rest close only on a FULL award, because a partial award leaves the unsourced items still in
 * play and their conversations still live.
 */
function cascadeNegotiations(
  negotiations: RfqDraft['negotiations'],
  awards: RfqAward[],
  fullAward: boolean,
): RfqDraft['negotiations'] {
  if (!negotiations) return negotiations
  const wonBidIds = new Set(awards.map((a) => a.bidId))
  const next: NonNullable<RfqDraft['negotiations']> = {}
  for (const [bidId, thread] of Object.entries(negotiations)) {
    if (wonBidIds.has(bidId)) next[bidId] = { ...thread, status: 'awarded' }
    else if (fullAward) next[bidId] = { ...thread, status: 'ended' }
    else next[bidId] = thread
  }
  return next
}

/**
 * Stamp `publishedAt` the FIRST time a record reaches `live`, and never again. Every route to live
 * runs through here — publishing from the wizard, verification clearing a held RFQ, and a partially
 * awarded RFQ returning to Live — so the date means "when suppliers could first bid on this", which
 * is the clock Avg RFQ-to-Award measures from.
 */
function withPublishedAt(record: RfqDraft): RfqDraft {
  if (record.status !== 'live' || record.publishedAt) return record
  return { ...record, publishedAt: new Date().toISOString() }
}

function upsert(draft: RfqDraft): RfqDraft {
  const record = { ...draft, updatedAt: new Date().toISOString() }
  const records = readStore()
  const index = records.findIndex((r) => r.id === record.id)
  if (index >= 0) records[index] = record
  else records.push(record)
  writeStore(records)
  return record
}

/** Demo RFQs so a fresh session's list looks lived-in. Only seeded when the store is empty; the
 * buyer's own created RFQs then append to these. Dates are relative to first load. */
function seedRfqs(): RfqDraft[] {
  const now = Date.now()
  const DAY = 86_400_000
  const at = (offsetDays: number) => new Date(now + offsetDays * DAY).toISOString()
  const make = (
    reference: string,
    title: string,
    category: string,
    status: RfqStatus,
    bids: number,
    createdDaysAgo: number,
    closingInDays: number,
  ): RfqDraft => ({
    id: reference,
    reference,
    status,
    ...draftDefaults(),
    title,
    categories: [{ name: category, type: categoryTypeOf(category) }],
    bids,
    // The buyer sets the window explicitly at both ends. An awaiting-verification RFQ is seeded with
    // a start still in the future — it is waiting on KYB, not on a date — so the detail page has a
    // record whose window has not opened yet.
    openingDate: status === 'awaiting_verification' ? at(2) : at(-createdDaysAgo),
    closingDate: at(closingInDays),
    // Buyers ask for delivery a fortnight after bidding closes, so every quoted date, award and
    // purchase order sits AFTER the offer that promised it.
    requiredDeliveryDate: at(closingInDays + 14),
    createdAt: at(-createdDaysAgo),
    updatedAt: at(-createdDaysAgo),
  })

  const rfqs = [
    make('RFQ-2026-0145', 'Pallet Racking, Warehouse B', 'Construction & building materials', 'live', 2, 1, 11),
    make('RFQ-2026-0144', 'Site Scaffolding Hire', 'Facility management services', 'live', 4, 3, 8),
    make('RFQ-2026-0143', 'Rebar Couplers, Type 2', 'Steel, metals & fabrication', 'live', 5, 2, 6),
    make('RFQ-2026-0142', 'Steel Rebar, Grade 60', 'Construction & building materials', 'live', 7, 2, 3),
    make('RFQ-2026-0141', 'Cement Supply, Q3', 'Cement, concrete & aggregates', 'live', 4, 3, 5),
    make('RFQ-2026-0140', 'Water Tanks, GRP', 'Water & wastewater treatment', 'live', 5, 4, 7),
    make('RFQ-2026-0139', 'IT Networking Refresh', 'IT, networking & software', 'live', 2, 5, 4),
    make('RFQ-2026-0138', 'Office Furniture, 120 Workstations', 'Furniture & fixtures', 'live', 3, 4, 6),
    make('RFQ-2026-0137', 'Catering, Staff Canteen', 'Food, beverage & catering', 'live', 3, 3, 9),
    make('RFQ-2026-0131', 'HVAC Maintenance, 12 months', 'Facility management services', 'awarded', 11, 20, -2),
    make('RFQ-2026-0130', 'Diesel Generators ×4', 'Heavy equipment & machinery', 'awarded', 8, 25, -3),
    make('RFQ-2026-0129', 'Steel Pipes, API 5L', 'Steel, metals & fabrication', 'awarded', 9, 22, -4),
    make('RFQ-2026-0128', 'Consulting, Process Audit', 'Professional & consulting services', 'awarded', 4, 24, -5),
    make('RFQ-2026-0127', 'Safety Equipment, PPE Bundle', 'Safety, security & PPE', 'live', 2, 6, 8),
    make('RFQ-2026-0126', 'Uniforms, 300 Sets', 'Uniforms & textiles', 'live', 1, 1, 10),
    // Awaiting verification — held until the org passes KYB; not yet visible to suppliers (no bids).
    make('RFQ-2026-0125', 'Laboratory Equipment', 'Medical & laboratory supplies', 'awaiting_verification', 0, 1, 7),
    make('RFQ-2026-0124', 'Fire Safety System', 'Safety, security & PPE', 'awaiting_verification', 0, 2, 9),
    make('RFQ-2026-0119', 'Fleet Tyres, Heavy Duty', 'Vehicles & automotive parts', 'draft', 0, 3, 0),
    make('RFQ-2026-0118', 'Solar Panels, Rooftop', 'Solar & renewable energy', 'draft', 0, 1, 0),
    make('RFQ-2026-0117', 'Office Stationery, Q3', 'Office supplies & stationery', 'draft', 0, 1, 0),
    make('RFQ-2026-0113', 'Diesel Generators, Backup', 'Heavy equipment & machinery', 'partially_awarded', 6, 28, -4),
    make('RFQ-2026-0112', 'Warehouse Racking System', 'Construction & building materials', 'expired', 5, 30, -5),
    make('RFQ-2026-0111', 'Cleaning Services, Annual', 'Cleaning & janitorial', 'cancelled', 6, 28, -6),
    make('RFQ-2026-0110', 'Forklift Spare Parts', 'MRO & industrial spare parts', 'expired', 2, 26, -7),
  ]

  // A cancelled RFQ keeps the reason its buyer gave — it was shared with every bidder at the time
  // and the detail page reads it back, so the seed has to carry one.
  const cancelled = rfqs.find((rfq) => rfq.status === 'cancelled')
  if (cancelled) {
    cancelled.cancelReason =
      'Project postponed to Q4 pending budget approval. We expect to re-issue this requirement and will invite the same suppliers.'
    cancelled.cancelledAt = at(-6)
  }

  // Order matters: bids are what the supplier did, awards resolve them into won/lost, and threads
  // are the conversations those bids opened.
  withSeededSupplierBids(rfqs)
  withSeededAwards(rfqs)
  withSeededNegotiations(rfqs)
  return rfqs
}

/**
 * What the signed-in supplier has done on each seeded RFQ, stated outright rather than inferred
 * from the anonymous bid set. `status` is their INTENT — what they last chose; the RFQ's own
 * lifecycle then resolves it (a submitted bid on an awarded RFQ reads Won or Lost depending on who
 * the award names, a live bid on a cancelled RFQ reads Cancelled, and so on).
 *
 * Every RFQ not listed here is one they have not bid on, which is what makes the Submit-bid flow
 * testable from scratch. Between them these entries put all ten supplier bid statuses, all five
 * buyer bid statuses and all four negotiation statuses on screen from a fresh session.
 */
const SUPPLIER_BIDS: {
  ref: string
  status: SupplierBidStatus
  /**
   * Days from the RFQ opening until the offer lapses (default 30). Set it shorter than the RFQ's
   * own window to seed a bid that expired while the RFQ is still taking bids.
   */
  validForDays?: number
  withdrawReason?: string
}[] = [
  // ── Live: still actionable ────────────────────────────────────────────────
  { ref: 'RFQ-2026-0142', status: 'negotiating' }, // buyer countered, supplier accepted → Agreed
  { ref: 'RFQ-2026-0141', status: 'negotiating' }, // mid-conversation, awaiting a reply
  { ref: 'RFQ-2026-0137', status: 'negotiating' }, // buyer closed the conversation → Ended
  { ref: 'RFQ-2026-0140', status: 'negotiating' }, // supplier replied last → Awaiting buyer
  { ref: 'RFQ-2026-0143', status: 'submitted' },
  { ref: 'RFQ-2026-0138', status: 'submitted' },
  { ref: 'RFQ-2026-0126', status: 'draft' }, // never sent; the buyer's bid count is untouched
  { ref: 'RFQ-2026-0127', status: 'withdrawn', withdrawReason: 'Our supplier of the FFP2 masks has put the line on allocation until October, so we cannot commit to the quantities on items 6 and 7 by the required date.' },
  // Submitted on day 1 with a short 3-day validity, so it lapsed 2 days ago while the RFQ still
  // has 4 days to run → Expired, and the supplier is prompted to extend it.
  { ref: 'RFQ-2026-0139', status: 'submitted', validForDays: 3 },
  // RFQ-2026-0145 and -0144 are deliberately absent: two open RFQs to bid on from scratch.

  // ── Resolved: the RFQ's outcome decides what these become ─────────────────
  { ref: 'RFQ-2026-0131', status: 'negotiating' }, // awarded to this supplier → Won (thread Awarded)
  { ref: 'RFQ-2026-0129', status: 'submitted' }, // awarded to this supplier → Won
  { ref: 'RFQ-2026-0130', status: 'submitted' }, // awarded elsewhere → Lost
  { ref: 'RFQ-2026-0113', status: 'submitted' }, // partially awarded elsewhere → Lost
  { ref: 'RFQ-2026-0112', status: 'submitted' }, // RFQ expired → Lost
  { ref: 'RFQ-2026-0110', status: 'submitted' }, // RFQ expired → Lost
  { ref: 'RFQ-2026-0111', status: 'submitted' }, // RFQ cancelled underneath it → Cancelled
  { ref: 'RFQ-2026-0128', status: 'declined' }, // "Not interested" — no bid, no price
]

/** The historical RFQs the award names this supplier on, so their history holds wins and losses. */
const SUPPLIER_WON = new Set(['RFQ-2026-0131', 'RFQ-2026-0129'])

/**
 * Where each seeded conversation has got to. `awaitingSupplier` stops after the buyer's counter so
 * the supplier's own Accept / Revise / Withdraw actions are testable without first driving a round;
 * the default (no entry) leaves the supplier's reply on the table, awaiting the buyer.
 */
const THREAD_STATE: Record<string, 'agreed' | 'ended' | 'awaitingSupplier'> = {
  'RFQ-2026-0142': 'agreed',
  'RFQ-2026-0141': 'awaitingSupplier',
  'RFQ-2026-0137': 'ended',
}

/** How long ago each conversation last moved — see {@link rebaseTo}. */
const THREAD_LAST_ACTIVITY_HOURS: Record<string, number> = {
  'RFQ-2026-0142': 3,
  'RFQ-2026-0141': 9,
  'RFQ-2026-0140': 30,
  'RFQ-2026-0137': 50,
}

/**
 * Slide a whole thread so its latest offer lands at `endAt`, keeping the gaps between offers. The
 * derived timestamps hang off the RFQ's creation date, which on a two-day-old RFQ puts the last
 * offer at "now" and makes every activity line read 0m ago.
 *
 * `notBefore` is the RFQ's own opening: on a short window the shift would otherwise drag the first
 * offer back past the request that invited it, so the thread compresses forward instead.
 */
function rebaseTo(thread: NegotiationThread, endAt: number, notBefore: number): NegotiationThread {
  const first = new Date(thread.offers[0].at).getTime()
  const last = new Date(thread.offers[thread.offers.length - 1].at).getTime()
  const shift = Math.max(endAt - last, notBefore - first)
  const move = (iso: string) => new Date(new Date(iso).getTime() + shift).toISOString()
  return {
    ...thread,
    offers: thread.offers.map((offer) => ({ ...offer, at: move(offer.at) })),
    agreedAt: thread.agreedAt ? move(thread.agreedAt) : undefined,
    updatedAt: move(thread.updatedAt),
  }
}

/** Write {@link SUPPLIER_BIDS} onto the seeded records. */
function withSeededSupplierBids(rfqs: RfqDraft[]): void {
  SUPPLIER_BIDS.forEach((seed, index) => {
    const rfq = rfqs.find((r) => r.reference === seed.ref)
    if (!rfq) return
    const detail = deriveRfqDetail(rfq)
    const sent = seed.status !== 'draft' && seed.status !== 'declined'
    rfq.supplierBid = {
      status: seed.status,
      lines: seed.status === 'declined' ? [] : blankBidLines(detail),
      validUntil: addDays(rfq.createdAt, seed.validForDays ?? 30),
      paymentTermsLabel: rfq.milestones.map((m) => m.percent).join(' / '),
      paymentTermsKind: 'accepted',
      attachments: SUPPLIER_PROFILE.savedDocuments.map((doc) => doc.name),
      submittedAt: sent ? addDays(rfq.createdAt, 1) : undefined,
      withdrawReason: seed.withdrawReason,
      updatedAt: lastTouched(rfq.createdAt, index),
    }
  })
}

/**
 * When the supplier last touched this bid: two days after the RFQ opened, but never in the future
 * and never less than a few hours ago — otherwise a recently-opened RFQ reads "0m ago" on every
 * row. Staggered per entry so the activity column reads like a real history rather than a batch.
 */
function lastTouched(createdAt: string, index: number): string {
  const twoDaysIn = new Date(createdAt).getTime() + 2 * 86_400_000
  const staggered = Date.now() - (3 + index * 5) * 3_600_000
  return new Date(Math.min(twoDaysIn, staggered)).toISOString()
}

/**
 * Give every resolved RFQ the award record it should already carry, so the award screen, the PO
 * reference and the supplier's Won/Lost split all read from real data. The award lands on this
 * supplier for {@link SUPPLIER_WON} and on someone else otherwise, and is dated just after the RFQ
 * closed — never before the bid it accepts was submitted.
 */
function withSeededAwards(rfqs: RfqDraft[]): void {
  for (const rfq of rfqs) {
    if (rfq.status !== 'awarded' && rfq.status !== 'partially_awarded') continue
    if (rfq.awards?.length) continue

    const detail = deriveRfqDetail(rfq)
    const ours = detail.bids[0] ?? null
    const rivals = detail.bids
      .filter((b) => b !== ours && (b.status === 'submitted' || b.status === 'negotiating'))
      .sort((a, b) => a.totalSar - b.totalSar)

    // Prefer a winner whose coverage matches the status the seed asked for — a fully-awarded RFQ
    // wants a bid covering every line, a partially-awarded one wants a bid that leaves a gap.
    const wantsPartial = rfq.status === 'partially_awarded'
    const covers = (b: Bid) => b.itemsCovered === b.itemsTotal
    const candidates = SUPPLIER_WON.has(rfq.reference) ? [ours] : rivals
    const winner = candidates.find((b) => b && covers(b) !== wantsPartial) ?? candidates[0] ?? null
    if (!winner) continue

    rfq.awards = [{ ...buildAward(rfq, detail, winner), awardedAt: addDays(rfq.closingDate, 1) }]
    // The award is the authority on coverage: the status follows it, never the other way round.
    rfq.status = awardStatusFor(rfq.awards)
  }
}

/**
 * Open the conversations the seeded bids imply. Each negotiating supplier bid gets its thread, plus
 * a second rival thread on RFQ-0141 so the buyer's "Negotiating" detail (Amend withdrawn,
 * Extend-the-window only) is testable. {@link THREAD_STATE} pushes two of them past the counter
 * stage so Agreed and Closed are on screen without having to drive the flow first.
 */
function withSeededNegotiations(rfqs: RfqDraft[]): void {
  for (const rfq of rfqs) {
    const wantsThread =
      rfq.supplierBid?.status === 'negotiating' || rfq.reference === 'RFQ-2026-0141'
    if (!wantsThread) continue

    const detail = deriveRfqDetail(rfq)
    const threads: Record<string, NegotiationThread> = {}

    // A resolved RFQ's conversation ended before the award; a live one ended recently.
    const opened = new Date(rfq.createdAt).getTime()
    const award = rfq.awards?.[0]
    const endAt = award
      ? new Date(award.awardedAt).getTime() - 86_400_000
      : Date.now() - (THREAD_LAST_ACTIVITY_HOURS[rfq.reference] ?? 12) * 3_600_000

    const ours = detail.bids[0]
    if (ours) {
      const state = THREAD_STATE[rfq.reference]
      let thread = deriveThread(rfq, detail, ours)

      // Stop after the buyer's counter so the ball is in the supplier's court.
      if (state === 'awaitingSupplier') {
        const upToBuyer = thread.offers.slice(0, thread.offers.findLastIndex((o) => o.by === 'buyer') + 1)
        thread = { ...thread, offers: upToBuyer, updatedAt: upToBuyer[upToBuyer.length - 1].at }
      }
      if (state === 'ended') thread = { ...thread, status: 'ended' }
      if (state === 'agreed') {
        thread = {
          ...thread,
          status: 'agreed',
          // The supplier accepted the buyer's counter — the version before their own latest.
          agreedVersion: thread.offers.findLast((o) => o.by === 'buyer')?.version,
          agreedBy: 'supplier',
          agreedAt: thread.updatedAt,
        }
      }
      threads[ours.id] = rebaseTo(thread, endAt, opened)
    }

    // A second, rival conversation so the buyer sees more than one thread on this RFQ.
    if (rfq.reference === 'RFQ-2026-0141') {
      const rival = detail.bids.find((b) => b !== ours && b.status === 'negotiating')
      if (rival) {
        threads[rival.id] = rebaseTo(deriveThread(rfq, detail, rival), endAt - 5 * 3_600_000, opened)
      }
    }

    rfq.negotiations = threads
  }
}

export const rfqApi = {
  /** Saved delivery addresses for the "Deliver to" picker. */
  getAddresses(): Promise<RfqAddress[]> {
    return delay(ADDRESSES)
  },

  /** Persist the working draft as `draft` (Save draft action + autosave). */
  saveDraft(draft: RfqDraft): Promise<RfqDraft> {
    return delay(upsert({ ...draft, status: 'draft' }))
  },

  /** Finalise the wizard, storing under the status the outcome implies. */
  submitRfq(draft: RfqDraft, outcome: RfqOutcome): Promise<RfqDraft> {
    return delay(upsert(withPublishedAt({ ...draft, status: statusFor(outcome) })))
  },

  /** The RFQ list read-model — seeds demo RFQs on first load so the list isn't empty. */
  listRfqs(): Promise<RfqDraft[]> {
    let records = readStore()
    if (records.length === 0) {
      records = seedRfqs()
      writeStore(records)
    }
    return delay(records.slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  },

  /** A single RFQ by id (seeds first so a detail link works on a fresh session). */
  getRfq(id: string): Promise<RfqDraft | null> {
    let records = readStore()
    if (records.length === 0) {
      records = seedRfqs()
      writeStore(records)
    }
    return delay(records.find((r) => r.id === id) ?? null)
  },

  /**
   * Change an RFQ's lifecycle status (Close early / Cancel). Cancelling carries the buyer's reason,
   * which is shared verbatim with every bidder — it is stamped onto the record here rather than
   * discarded, so the cancelled detail page can read it back.
   */
  setStatus(id: string, status: RfqStatus, cancelReason?: string): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    const cancelled = status === 'cancelled'
    return delay(
      upsert(
        withPublishedAt({
          ...record,
          status,
          ...(cancelled && { cancelReason, cancelledAt: new Date().toISOString() }),
        }),
      ),
    )
  },

  /**
   * Record that the buyer has now seen these bids, so they stop counting towards "Bids to Review".
   * Unioned, never replaced — opening three bids today must not un-open the two opened yesterday —
   * and idempotent, so re-expanding a row is a no-op that still resolves with the record.
   */
  markBidsOpened(id: string, bidIds: string[]): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    const seen = new Set(record.openedBidIds ?? [])
    let added = false
    for (const bidId of bidIds) {
      if (seen.has(bidId)) continue
      seen.add(bidId)
      added = true
    }
    // Nothing new: skip the write so `updatedAt` doesn't churn and reorder the RFQ list.
    if (!added) return delay(record)
    return delay(upsert({ ...record, openedBidIds: [...seen] }))
  },

  /** Extend the bidding window — moves the closing date; bids already submitted are untouched. */
  extendClosing(id: string, closingDate: string): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    return delay(upsert({ ...record, closingDate }))
  },

  /** Permanently remove a draft (only ever offered for never-published drafts). */
  deleteRfq(id: string): Promise<void> {
    writeStore(readStore().filter((r) => r.id !== id))
    return delay(undefined)
  },

  /** Award the RFQ — stores one award per winning supplier (split-aware) and moves it to `awarded`
   * when every line is sourced, or `partially_awarded` when the award(s) leave lines uncovered. */
  awardRfq(id: string, awards: RfqAward[]): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    const status = awardStatusFor(awards)
    return delay(
      upsert({
        ...record,
        status,
        awards,
        // The award cascades onto the conversations by itself: a FULL award closes every one of
        // them, while a PARTIAL award closes none — the RFQ keeps taking bids on the rest, so those
        // conversations must stay open. Either way the winning threads read as awarded.
        negotiations: cascadeNegotiations(record.negotiations, awards, status === 'awarded'),
      }),
    )
  },

  /** Persist a negotiation thread (buyer counter / end) onto its RFQ, keyed by bid id. */
  saveNegotiation(id: string, thread: NegotiationThread): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    const negotiations = { ...record.negotiations, [thread.bidId]: thread }
    return delay(upsert({ ...record, negotiations }))
  },

  /**
   * Persist the signed-in supplier's own bid (save draft / submit / decline / withdraw). The first
   * submission also bumps the RFQ's bid count, since the buyer's list counts bids received — a
   * draft the supplier is still writing has reached nobody.
   */
  saveSupplierBid(id: string, supplierBid: SupplierBidRecord): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    const firstSubmission = supplierBid.status === 'submitted' && record.supplierBid?.submittedAt == null
    return delay(
      upsert({
        ...record,
        supplierBid: { ...supplierBid, updatedAt: new Date().toISOString() },
        bids: firstSubmission ? record.bids + 1 : record.bids,
      }),
    )
  },

  /** Append a message to the post-award order conversation. */
  appendOrderMessage(id: string, message: OrderMessage): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    const orderMessages = [...(record.orderMessages ?? []), message]
    return delay(upsert({ ...record, orderMessages }))
  },
}
