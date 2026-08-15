import type { Milestone, PaymentPreset } from './create/paymentRules'

/**
 * Lifecycle of an RFQ. `draft` (parked) and `awaiting_verification` (built but the org isn't
 * verified yet, so it auto-publishes on approval) are both pre-live; `live` is published to
 * suppliers; then `awarded` (every line sourced) or `partially_awarded` (some lines left
 * unsourced); `cancelled` if the buyer ends the exercise; `expired` once the closing date passes
 * with no award.
 */
export type RfqStatus =
  | 'draft'
  | 'awaiting_verification'
  | 'live'
  | 'awarded'
  | 'partially_awarded'
  | 'cancelled'
  | 'expired'

/** Row shape for the RFQ list read-model. */
export interface Rfq {
  id: string
  title: string
  status: RfqStatus
  createdAt: string
}

/** A sourcing category's nature — decides the column schema of its line-item group. */
export type CategoryType = 'goods' | 'service'

/** One selected sourcing category. `type` drives whether its items read as goods or service. */
export interface RfqCategory {
  name: string
  type: CategoryType
}

/** How line items are entered on step 1. */
export type LineInputMethod = 'manual' | 'excel' | 'link'

/**
 * A requested line item, tagged with the category group it belongs to. ONE flat shape serves
 * both schemas: under a goods category the fields read Item / Specification / Qty / Unit; under a
 * service category the SAME fields are surfaced and labelled Deliverable / Scope / Duration / Basis.
 * Keeping a single shape lets the bid, compare and award surfaces price items by one index.
 */
export interface LineItem {
  id: string
  /** The {@link RfqCategory.name} this item is grouped under. */
  categoryName: string
  name: string
  specification: string
  quantity: number
  unit: string
  /**
   * The quantity range the buyer will accept ON THIS LINE — the floor and ceiling of what a
   * supplier may offer for it. Both optional and independent: a line with neither is unbounded and
   * the supplier offers whatever they can, which is how every RFQ behaved before these existed.
   *
   * This is a DIFFERENT axis from `RfqDraft.minItemsPerBid` / `maxItemsPerBid`. Those bound how
   * many LINES one bid must cover (the partial-bid rule); these bound HOW MUCH may be offered on a
   * line that is covered. A bid has to satisfy both.
   */
  minQuantity?: number
  maxQuantity?: number
}

/**
 * Display label for a category set — first name plus an overflow count, e.g. "Construction +1".
 * Tolerates `undefined` so a record persisted under an older schema (no `categories`) can't crash.
 */
export function categoryLabel(categories: RfqCategory[] | undefined): string {
  if (!categories || categories.length === 0) return ''
  const [first, ...rest] = categories
  return rest.length > 0 ? `${first.name} +${rest.length}` : first.name
}

/** True when the RFQ spans both goods and service categories (drives the "Mixed RFQ" helper). */
export function isMixedSourcing(categories: RfqCategory[] | undefined): boolean {
  const list = categories ?? []
  return list.some((c) => c.type === 'goods') && list.some((c) => c.type === 'service')
}

/** The RFQ's sourcing type, derived from the selected categories. `none` = nothing selected yet. */
export type RfqSourcing = 'none' | 'goods' | 'service' | 'mixed'

/**
 * Derive the RFQ sourcing type from the selected categories — goods-only, service-only, or mixed
 * when both are present. Drives the Step 1 type indicator; recomputed on every add/remove.
 */
export function rfqSourcing(categories: RfqCategory[] | undefined): RfqSourcing {
  const list = categories ?? []
  const hasGoods = list.some((c) => c.type === 'goods')
  const hasService = list.some((c) => c.type === 'service')
  if (hasGoods && hasService) return 'mixed'
  if (hasGoods) return 'goods'
  if (hasService) return 'service'
  return 'none'
}

/**
 * Infer a catalog category's nature from its name — a mock heuristic standing in for a
 * backend-provided `type` (flagged as ❓ in the analysis). Names reading like a service map to
 * `service`; everything else is `goods`.
 */
export function categoryTypeOf(name: string): CategoryType {
  return /services|consulting|management|catering|cleaning|supervision|maintenance|training|support/i.test(
    name,
  )
    ? 'service'
    : 'goods'
}

/** A saved delivery address the buyer can ship to. */
export interface RfqAddress {
  id: string
  label: string
}

/**
 * The full RFQ draft — the single source of truth the 4-step wizard reads and patches, and
 * the payload persisted on Save/Submit. Money fields are SAR major units; conversion to exact
 * halalas happens at the calculation boundary (see `shared/lib/money`).
 */
export interface RfqDraft {
  id: string
  reference: string
  status: RfqStatus
  /** Number of supplier bids received (0 until a live RFQ attracts bids). */
  bids: number
  /**
   * Set once the RFQ is awarded — one {@link RfqAward} per winning supplier. A single-supplier
   * award is a one-element array; a split award has one entry per supplier (each with its own PO).
   */
  awards?: RfqAward[]
  /** Negotiation threads by bid id — only present once the buyer has opened/countered one. */
  negotiations?: Record<string, NegotiationThread>
  /** Free-text messages in the post-award order conversation. */
  orderMessages?: OrderMessage[]
  /** The logged-in supplier's own bid on this RFQ — written once they save, submit or decline. */
  supplierBid?: SupplierBidRecord
  /** Why the buyer cancelled — required at cancellation and shared verbatim with every bidder. */
  cancelReason?: string
  /** When the buyer cancelled (ISO) — drives the "Cancelled {date}" chip on the detail page. */
  cancelledAt?: string

  // Step 1 — Requirement
  categories: RfqCategory[]
  title: string
  /** Estimated budget in SAR; `0` means none entered (the field is optional). */
  budget: number
  lineInputMethod: LineInputMethod
  lineItems: LineItem[]

  // Step 2 — Delivery & terms
  /** Opt-in: allow the RFQ to be awarded across multiple suppliers (one order each) rather than to
   * a single winner. Off by default; the Step-2 checkbox and award-time gating wire this up. */
  splitAwardAllowed: boolean
  deliverToCompanyAddress: boolean
  /** The chosen delivery address label (defaults to the company/registration address). */
  deliveryAddress: string
  requiredDeliveryDate: string
  /**
   * Start of the bidding window — the buyer sets an explicit date/time the RFQ opens for bids
   * (it is NOT derived from the publication moment). An `awaiting_verification` RFQ can carry a
   * future opening date; verification clearing never moves it.
   */
  openingDate: string
  /** End of the bidding window — the explicit date/time bidding closes. */
  closingDate: string
  partialDeliveryAllowed: boolean
  /** When true, a supplier may quote a subset of items (min..max of the total item count). */
  partialBidsAllowed: boolean
  /** Fewest items a single bid must cover (only meaningful when partial bids are allowed). */
  minItemsPerBid: number
  /** Most items a single bid may cover; `0` means "all" (the full line-item count). */
  maxItemsPerBid: number
  paymentPreset: PaymentPreset
  milestones: Milestone[]

  // Step 3 — Suppliers
  acceptanceCriteria: string
  specDocumentName: string
  certifications: string[]
  minimumWarranty: string
  regions: string[]
  favouritesOnly: boolean

  createdAt: string
  updatedAt: string
  /**
   * The moment the RFQ FIRST went live. Stamped once and never reset — a partially awarded RFQ
   * that returns to Live keeps its original date, so Avg RFQ-to-Award measures one window per RFQ
   * however many times it reopens. Optional so records persisted before this field existed still
   * load; consumers fall back to `createdAt`.
   */
  publishedAt?: string
  /**
   * Bids the BUYER ORGANISATION has already opened, so "Bids to Review" can count only the unseen
   * ones. Opened once is opened for every user in the org — the tile answers "what has nobody here
   * looked at", not "what have I personally looked at". Absent on records that predate the field.
   */
  openedBidIds?: string[]
}

/**
 * A supplier's bid on an RFQ (mock — identities stay masked until award).
 * `submitted`/`negotiating` are the active states that can still be awarded; `withdrawn`,
 * `declined` and `expired` are terminal and drop the bid out of the eligible set.
 */
export type BidStatus = 'submitted' | 'negotiating' | 'withdrawn' | 'declined' | 'expired'

/**
 * How a bid READS once the RFQ itself has resolved. Kept separate from {@link BidStatus} — which is
 * the bid's own stored lifecycle — because Won/Lost are a property of the RFQ's outcome, not of
 * anything the bidder did: on an awarded RFQ the bids the award names read Won and the rest Lost,
 * and on a cancelled/expired RFQ every bid reads Lost. A supplier reading "Lost" was never
 * identified to the buyer at all (spec: "Lost = identity never revealed").
 */
export type BidOutcome = BidStatus | 'won' | 'lost'

/**
 * A bid priced line — the per-line detail behind {@link Bid.unitPrices}. `unitPrice` null means the
 * bidder is NOT supplying that line ("Not supplying"); `qtyQuoted < qtyRequired` is a partial quote
 * rendered as "q of r"; `deliveryLabel` is a short, seeded date the line can be delivered by (e.g. "24 Aug").
 */
export interface BidLine {
  unitPrice: number | null
  qtyQuoted: number
  qtyRequired: number
  deliveryLabel: string
}

/** The real supplier behind a masked bid — revealed only at award. */
export interface SupplierIdentity {
  companyName: string
  cr: string
  vat: string
  address: string
  contactName: string
  contactRole: string
  certifications: string[]
}

export interface Bid {
  id: string
  /** Masked label while the RFQ is blind, e.g. "Supplier A". */
  bidder: string
  status: BidStatus
  /** AI match score against the RFQ (0–100). */
  matchPct: number
  /** Bid total in SAR major units, VAT-inclusive. */
  totalSar: number
  itemsCovered: number
  itemsTotal: number
  /** Per requested line item; `null` = the bidder is not supplying that item. */
  unitPrices: (number | null)[]
  /** Per requested line item — richer detail (price, quoted-vs-required qty, per-line delivery). */
  lines: BidLine[]
  deliveryDate: string
  leadTimeDays: number
  /** Whether the bidder accepted the RFQ terms or countered, plus the percentages. */
  paymentTerms: { kind: 'accepted' | 'counter'; label: string }
  validUntil: string
  /** Required cert name → whether the bidder provided it. */
  compliance: Record<string, boolean>
  negotiationRounds: number
  identity: SupplierIdentity
}

/** One line within an offer — negotiation is line-by-line (price + qty per line, include/exclude). */
export interface OfferLine {
  /** 0-based index into the RFQ's line items. */
  index: number
  name: string
  unit: string
  /** Quantity on this offer's take of the line. */
  quantity: number
  /** Unit price in SAR major units, VAT-INCLUSIVE — the line sum IS the offer total. */
  unitPriceSar: number
  /** Whether the line is part of this offer (a party may drop a line from the deal). */
  included: boolean
  /** When this line can be delivered (ISO). Lines may land on different dates; the offer's own
   * `deliveryDate` is the latest of the included lines. Optional for back-compat. */
  deliveryDate?: string
}

/** One offer version in a negotiation thread — an original bid, a buyer counter, or a supplier reply. */
export interface OfferVersion {
  /** 1-based, chronological. Also the "Offer v{n}" / round label. */
  version: number
  by: 'supplier' | 'buyer'
  /** Offer total in SAR major units, VAT-inclusive. Always equals the sum of the included lines. */
  totalSar: number
  /** Per-line breakdown — the unit of negotiation. Optional for back-compat with older persisted
   * threads; every offer built here carries it. */
  lines?: OfferLine[]
  /** The offer's headline delivery date — the latest of its included lines. */
  deliveryDate: string
  /**
   * How long THIS version stands. The supplier may raise it with any new version, forward only, so
   * a conversation's effective expiry is the latest `bidValidUntil` across its offers (see
   * `effectiveExpiry`). Absent on versions written before validity was extendable.
   */
  bidValidUntil?: string
  /** Display string for the schedule, always the percentages: "30 / 60 / 10". Derived from
   * `paymentMilestones` when present, so it and the schedule can never disagree. */
  paymentTermsLabel: string
  /** The payment schedule this offer proposes. Optional for back-compat with persisted threads
   * written before schedules were negotiable — `paymentTermsLabel` alone survives those. */
  paymentPreset?: PaymentPreset
  paymentMilestones?: Milestone[]
  itemsCovered: number
  itemsTotal: number
  /** Free text typed by the buyer on a counter. */
  message?: string
  /** i18n key for a seeded/canned message (kept bilingual; resolved in the UI). */
  messageKey?: string
  messageParams?: Record<string, string | number>
  at: string
}

/**
 * `active` = still open to counters; `agreed` = one side accepted the other's latest offer and the
 * terms are locked pending the buyer's purchase order (neither accept creates an order on its own);
 * `ended` = the buyer closed the conversation — the offer stays awardable; `awarded` = won.
 */
export type NegotiationStatus = 'active' | 'agreed' | 'ended' | 'awarded'

/** A per-supplier negotiation thread on an RFQ (buyer ↔ still-masked supplier). Persisted once touched. */
export interface NegotiationThread {
  bidId: string
  supplierLabel: string
  status: NegotiationStatus
  /** v1…vN, chronological. The latest supplier offer is what's "on the table". */
  offers: OfferVersion[]
  /** The offer version accepted, once `status` is `agreed` — these are the agreed terms. */
  agreedVersion?: number
  /** Who pressed accept. The other side is the one waiting. */
  agreedBy?: 'supplier' | 'buyer'
  agreedAt?: string
  /** Offer expiry (from the bid's validUntil). */
  validUntil: string
  updatedAt: string
}

/** A free-text message in the post-award order conversation (identities revealed, terms locked). */
export interface OrderMessage {
  by: 'supplier' | 'buyer'
  /** Display author — a real name once identities are revealed, or "You". */
  author: string
  text: string
  at: string
}

/**
 * Lifecycle of the SUPPLIER's own bid, as the supplier sees it.
 *
 * `invited` is the pre-bid state (matched, nothing sent) and carries no bid record. `draft` lives
 * until the RFQ closing date, then expires. `submitted` → `negotiating` only when the BUYER answers
 * with an offer. `won` / `lost` are set when the RFQ resolves; `cancelled` when the buyer withdraws
 * the RFQ underneath the bid. Per spec v1.1 there is no `rejected` — ending a negotiation leaves the
 * bid in the running.
 */
export type SupplierBidStatus =
  | 'invited'
  | 'draft'
  | 'submitted'
  | 'negotiating'
  | 'declined'
  | 'withdrawn'
  | 'expired'
  | 'won'
  | 'lost'
  | 'cancelled'

/** One priced line on the supplier's own bid. `included: false` reads as "Not supplying". */
export interface SupplierBidLine {
  /** 0-based index into the RFQ's line items. */
  index: number
  included: boolean
  /** Quantity offered — may be below the requested quantity (a short quote). */
  quantity: number
  /** VAT-inclusive unit price in SAR major units; the line sum IS the bid total. */
  unitPriceSar: number
  /** ISO date this line can be delivered by. */
  deliveryDate: string
}

/**
 * The supplier's own bid on an RFQ, persisted the moment they touch it (save draft, submit,
 * decline, withdraw). Absent means "never touched" — the derivation then falls back to the seeded
 * bid so the demo reads as lived-in. Mock-only: one supplier persona per session.
 */
export interface SupplierBidRecord {
  status: SupplierBidStatus
  lines: SupplierBidLine[]
  /** The supplier's own clock — what expires the bid (spec §6). */
  validUntil: string
  paymentTermsLabel: string
  /** Whether the supplier took the buyer's payment terms or countered them. */
  paymentTermsKind: 'accepted' | 'counter'
  attachments: string[]
  submittedAt?: string
  /** Required and shared with the buyer in full (spec §9). */
  withdrawReason?: string
  updatedAt: string
}

/** The confirmed award on an RFQ — the winning bid's terms + the generated PO. */
export interface RfqAward {
  bidId: string
  supplierLabel: string
  identity: SupplierIdentity
  agreedTotalSar: number
  itemsCovered: number
  itemsTotal: number
  /** 0-based RFQ line indexes allocated to this awarded supplier (drives split-award POs). */
  lineIndexes: number[]
  /** Requested line-item names not covered by the winning bid. */
  unsourcedItems: string[]
  deliveryDate: string
  paymentTermsLabel: string
  negotiationRounds: number
  savedVsOriginalSar: number
  offerVersion: number
  poNumber: string
  overrideReason?: string
  awardedAt: string
}

/** The four terminal outcomes after leaving the wizard (each renders a result card). */
export type RfqOutcome = 'draft_saved' | 'published' | 'verify_to_publish'

/** The result-card summary shown on any terminal outcome. */
export interface RfqResult {
  outcome: RfqOutcome
  reference: string
  status: RfqStatus
  category: string
  closingDate: string
  matchedSuppliers: number
}
