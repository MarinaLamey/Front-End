/**
 * Verification mock API — stands in for the back-office KYB service until the BFF exists.
 * Backed by localStorage so a super-admin's decision in the admin console is read by the buyer's
 * dashboard (same browser, different view). Requests are REAL: one is created when an org registers
 * (its CR + VAT), and the super-admin reviews each document independently. Every call is async with
 * a small latency to mimic the network; swap this one file for the real client and the TanStack
 * Query hooks / components don't change.
 */

/** Per-document review state. */
export type DocStatus = 'verifying' | 'verified' | 'rejected'
/** Org-level status, DERIVED from its documents (never set directly). */
export type VerificationStatus = 'pending' | 'verified' | 'rejected'
/** The reviewable documents on a request — CR (Wathiq), VAT (ZATCA), National Address (SPL). */
export type DocKey = 'cr' | 'vat' | 'nationalAddress'

export interface DocReview {
  /** The CR / VAT / National Address number submitted at registration. */
  number: string
  status: DocStatus
  /** The admin's typed reason — set only when this document is rejected. */
  reason?: string
}

export interface OrgVerification {
  orgId: string
  orgName: string
  documents: Record<DocKey, DocReview>
  /** Derived from the documents (all verified → verified; any rejected → rejected; else pending). */
  status: VerificationStatus
  submittedAt: string
  decidedAt?: string
}

/** What registration supplies to open a request. */
export interface OrgRegistration {
  orgId: string
  orgName: string
  cr: string
  vat: string
  /** Optional so the existing registration call site keeps compiling; falls back to a dash. */
  nationalAddress?: string
}

export const DOC_KEYS: DocKey[] = ['cr', 'vat', 'nationalAddress']

/** localStorage key for the mock table — exported so other tabs can react to writes (cross-tab sync).
 *  v2: National Address joined CR + VAT, so v1 records (which lack it) are dropped rather than read. */
export const VERIFICATION_STORAGE_KEY = 'miproc.verifications.v2'
const STORAGE_KEY = VERIFICATION_STORAGE_KEY
const LATENCY = 400

type Table = Record<string, OrgVerification>

function read(): Table {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as Table
  } catch {
    /* storage unavailable */
  }
  return {}
}

function write(table: Table): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(table))
  } catch {
    /* storage unavailable */
  }
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY))
}

// The app runs in the browser, so a real clock is fine here.
const now = (): string => new Date().toISOString()

/**
 * Org status is a pure function of its documents. A single rejected document does NOT reject the
 * org — the buyer can re-upload it, so the org stays `pending` and the rejected document is flagged
 * for re-submission. The org is `verified` only when every document passes, and `rejected` only when
 * every document is rejected (a genuine dead-end).
 */
function deriveStatus(documents: Record<DocKey, DocReview>): VerificationStatus {
  const states = DOC_KEYS.map((key) => documents[key].status)
  if (states.every((s) => s === 'verified')) return 'verified'
  if (states.every((s) => s === 'rejected')) return 'rejected'
  return 'pending'
}

function reconcile(record: OrgVerification): OrgVerification {
  const status = deriveStatus(record.documents)
  const decided = DOC_KEYS.every((key) => record.documents[key].status !== 'verifying')
  return { ...record, status, decidedAt: decided ? (record.decidedAt ?? now()) : undefined }
}

export const verificationApi = {
  /**
   * Open a FRESH request for a registering org. A registration is a new application, so any prior
   * decisions for this org are superseded — both documents go back to `verifying` and the org to
   * `pending`. (This is only called from registration, and lazily from the buyer read when no
   * record exists yet — an already-registered org keeps its decisions, since the read returns the
   * existing record instead of re-opening.)
   */
  async openRequest(reg: OrgRegistration): Promise<OrgVerification> {
    const table = read()
    const record = reconcile({
      orgId: reg.orgId,
      orgName: reg.orgName,
      documents: {
        cr: { number: reg.cr, status: 'verifying' },
        vat: { number: reg.vat, status: 'verifying' },
        nationalAddress: { number: reg.nationalAddress ?? '—', status: 'verifying' },
      },
      status: 'pending',
      submittedAt: now(),
    })
    table[reg.orgId] = record
    write(table)
    return delay(record)
  },

  /** Buyer read — the org's request, or null if it hasn't registered a request yet. */
  async getOrg(orgId: string): Promise<OrgVerification | null> {
    return delay(read()[orgId] ?? null)
  },

  /** Admin read — every request, newest submission first. */
  async listQueue(): Promise<OrgVerification[]> {
    const rows = Object.values(read()).sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    return delay(rows)
  },

  /** Admin decision on ONE document — approve, or reject with a typed reason. */
  async decideDoc(orgId: string, doc: DocKey, decision: 'verified' | 'rejected', reason?: string): Promise<OrgVerification> {
    const table = read()
    const record = table[orgId]
    if (!record) throw new Error(`Unknown org: ${orgId}`)
    const updated = reconcile({
      ...record,
      documents: {
        ...record.documents,
        [doc]: { ...record.documents[doc], status: decision, reason: decision === 'rejected' ? reason : undefined },
      },
    })
    table[orgId] = updated
    write(table)
    return delay(updated)
  },

  /** Buyer re-submits ONE rejected document → that document goes back to verifying. */
  async resubmitDoc(orgId: string, doc: DocKey): Promise<OrgVerification> {
    const table = read()
    const record = table[orgId]
    if (!record) throw new Error(`Unknown org: ${orgId}`)
    const updated = reconcile({
      ...record,
      documents: {
        ...record.documents,
        [doc]: { ...record.documents[doc], status: 'verifying', reason: undefined },
      },
    })
    table[orgId] = updated
    write(table)
    return delay(updated)
  },
}
