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
import type { RfqAddress, RfqDraft, RfqOutcome, RfqStatus, SourcingType } from '../types'

const STORE_KEY = 'miproc.rfqs.v1'
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

/** A fresh, rule-valid draft the wizard starts from (client-side; not yet persisted). */
export function createBlankDraft(): RfqDraft {
  const now = new Date().toISOString()
  return {
    id: id('rfq'),
    reference: nextReference(),
    status: 'draft',
    sourcing: 'goods' satisfies SourcingType,
    category: '',
    title: '',
    budget: 0,
    lineInputMethod: 'manual',
    lineItems: [],
    scopeOfWork: '',
    deliverables: [],
    timeline: '',
    deliverToCompanyAddress: true,
    deliveryAddress: '',
    requiredDeliveryDate: '',
    closingDate: '',
    partialDeliveryAllowed: true,
    paymentPreset: 'staged',
    milestones: presetMilestones('staged'),
    acceptanceCriteria: '',
    specDocumentName: '',
    certifications: [],
    minimumWarranty: '',
    ndaRequired: false,
    regions: [],
    favouritesOnly: false,
    createdAt: now,
    updatedAt: now,
  }
}

/** Maps a terminal outcome to the status the record is stored under. */
function statusFor(outcome: RfqOutcome): RfqStatus {
  switch (outcome) {
    case 'published':
      return 'open'
    case 'pending_approval':
      return 'pending_approval'
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

  /** The RFQ list read-model. */
  listRfqs(): Promise<RfqDraft[]> {
    return delay(readStore().slice().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)))
  },
}
