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
import type {
  LineInputMethod,
  NegotiationThread,
  OrderMessage,
  RfqAddress,
  RfqAward,
  RfqDraft,
  RfqOutcome,
  RfqStatus,
  SourcingType,
} from '../types'

const STORE_KEY = 'miproc.rfqs.v3'
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
    sourcing: 'goods' as SourcingType,
    category: '',
    title: '',
    budget: 0,
    lineInputMethod: 'manual' as LineInputMethod,
    lineItems: [],
    scopeOfWork: '',
    deliverables: [],
    timeline: '',
    deliverToCompanyAddress: true,
    deliveryAddress: '',
    requiredDeliveryDate: '',
    closingDate: '',
    partialDeliveryAllowed: true,
    paymentPreset: 'staged' as const,
    milestones: presetMilestones('staged'),
    acceptanceCriteria: '',
    specDocumentName: '',
    certifications: [] as string[],
    minimumWarranty: '',
    ndaRequired: false,
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
      return 'open'
    case 'draft_saved':
    case 'verify_to_publish':
      return 'draft'
  }
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
    category,
    bids,
    closingDate: at(closingInDays),
    createdAt: at(-createdDaysAgo),
    updatedAt: at(-createdDaysAgo),
  })

  return [
    make('RFQ-2026-0142', 'Steel Rebar, Grade 60', 'Construction & building materials', 'open', 7, 2, 3),
    make('RFQ-2026-0141', 'Cement Supply, Q3', 'Cement, concrete & aggregates', 'open', 4, 3, 5),
    make('RFQ-2026-0140', 'Water Tanks, GRP', 'Water & wastewater treatment', 'open', 5, 4, 7),
    make('RFQ-2026-0139', 'IT Networking Refresh', 'IT, networking & software', 'open', 2, 5, 4),
    make('RFQ-2026-0138', 'Office Furniture, 120 Workstations', 'Furniture & fixtures', 'open', 3, 4, 6),
    make('RFQ-2026-0137', 'Catering, Staff Canteen', 'Food, beverage & catering', 'open', 3, 3, 9),
    make('RFQ-2026-0131', 'HVAC Maintenance, 12 months', 'Facility management services', 'awarded', 11, 20, -2),
    make('RFQ-2026-0130', 'Diesel Generators ×4', 'Heavy equipment & machinery', 'awarded', 8, 25, -3),
    make('RFQ-2026-0129', 'Steel Pipes, API 5L', 'Steel, metals & fabrication', 'awarded', 9, 22, -4),
    make('RFQ-2026-0128', 'Consulting, Process Audit', 'Professional & consulting services', 'awarded', 4, 24, -5),
    make('RFQ-2026-0127', 'Safety Equipment, PPE Bundle', 'Safety, security & PPE', 'open', 1, 1, 8),
    make('RFQ-2026-0126', 'Uniforms, 300 Sets', 'Uniforms & textiles', 'open', 0, 1, 10),
    make('RFQ-2026-0119', 'Fleet Tyres, Heavy Duty', 'Vehicles & automotive parts', 'draft', 0, 3, 0),
    make('RFQ-2026-0118', 'Solar Panels, Rooftop', 'Solar & renewable energy', 'draft', 0, 1, 0),
    make('RFQ-2026-0117', 'Office Stationery, Q3', 'Office supplies & stationery', 'draft', 0, 1, 0),
    make('RFQ-2026-0112', 'Warehouse Racking System', 'Construction & building materials', 'closed', 5, 30, -5),
    make('RFQ-2026-0111', 'Cleaning Services, Annual', 'Cleaning & janitorial', 'closed', 6, 28, -6),
    make('RFQ-2026-0110', 'Forklift Spare Parts', 'MRO & industrial spare parts', 'closed', 2, 26, -7),
  ]
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
    return delay(upsert({ ...draft, status: statusFor(outcome) }))
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

  /** Change an RFQ's lifecycle status (Close early / Cancel). */
  setStatus(id: string, status: RfqStatus): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    return delay(upsert({ ...record, status }))
  },

  /** Award a bid — moves the RFQ to `awarded` and stores the winning terms + PO. */
  awardRfq(id: string, award: RfqAward): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    return delay(upsert({ ...record, status: 'awarded', award }))
  },

  /** Persist a negotiation thread (buyer counter / end) onto its RFQ, keyed by bid id. */
  saveNegotiation(id: string, thread: NegotiationThread): Promise<RfqDraft> {
    const records = readStore()
    const record = records.find((r) => r.id === id)
    if (!record) return Promise.reject(new Error('RFQ not found'))
    const negotiations = { ...record.negotiations, [thread.bidId]: thread }
    return delay(upsert({ ...record, negotiations }))
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
