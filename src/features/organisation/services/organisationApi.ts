/* ────────────────────────────────────────────────────────────────────────────
 * ORGANISATION mock API — the only owner of dynamic org data.
 *
 * localStorage-backed with artificial latency so the Org-Admin screens exercise their real
 * loading / optimistic paths. Seat accounting lives HERE, not in the UI: `used` is always
 * derived from the members list (active + invited), so an invite consuming a seat and a
 * disable freeing one can never drift from the roster on screen.
 *
 * Swap this one file for the real client and the pages / hooks do not change.
 * ──────────────────────────────────────────────────────────────────────────── */

import {
  DEMO_DISABLED_MEMBER,
  DEMO_MEMBERS,
  DEMO_ORG,
  DEMO_PLAN,
  DEMO_SEAT_LIMIT,
  DEMO_VAT_EXPIRES_IN_DAYS,
} from '@/platform/demo'
import type {
  InviteInput,
  OrgDocument,
  OrgMember,
  OrgMemberRole,
  OrganisationData,
  OrgAddress,
  OrgProfile,
  OrgSettings,
} from '../types'

/** Bumped when the seed shape changes, which force-reseeds and drops local edits. */
const STORE_KEY = 'miproc.organisation.v3'
const LATENCY = 350
/** Max seats per org (HLD: 5 on the Growth plan). */
export const SEAT_LIMIT = DEMO_SEAT_LIMIT
/** A document inside this window reads as `expiring` rather than `valid`. */
const EXPIRING_WINDOW_DAYS = 30

type Stored = Omit<OrganisationData, 'identity' | 'seats'> & { identity: OrganisationData['identity'] }

function read(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    if (raw) return JSON.parse(raw) as Stored
  } catch {
    /* storage unavailable */
  }
  return null
}

function write(record: Stored): Stored {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(record))
  } catch {
    /* storage unavailable */
  }
  return record
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY))
}

const now = () => new Date()
const iso = (d: Date) => d.toISOString()
const addDays = (days: number) => iso(new Date(now().getTime() + days * 86_400_000))
const id = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`

/**
 * Days until an ISO date, rounded UP: a certificate with 20 hours left still reads "expires in
 * 1 day" rather than 0, which would look like it had already lapsed.
 */
function daysUntil(isoDate: string): number {
  return Math.ceil((new Date(isoDate).getTime() - now().getTime()) / 86_400_000)
}

/**
 * Re-derive each document's status from its own expiry, so a stored `valid` can't linger past the
 * date it was valid until. A document with no expiry is still in review.
 */
function reconcileDocs(documents: OrgDocument[]): OrgDocument[] {
  return documents.map((doc) => {
    if (!doc.validUntil) return { ...doc, status: 'pending', expiresInDays: undefined }
    const left = daysUntil(doc.validUntil)
    return { ...doc, status: left <= EXPIRING_WINDOW_DAYS ? 'expiring' : 'valid', expiresInDays: left }
  })
}

/** Seats are counted, never stored: an invite holds a seat, a disabled member does not. */
function countSeats(members: OrgMember[]): OrganisationData['seats'] {
  let active = 0
  let invited = 0
  let disabled = 0
  for (const m of members) {
    if (m.status === 'active') active += 1
    else if (m.status === 'invited') invited += 1
    else disabled += 1
  }
  const used = active + invited
  return { total: SEAT_LIMIT, used, left: Math.max(0, SEAT_LIMIT - used), active, invited, disabled }
}

/**
 * The demo organisation. Rich enough to show every state the screens have: a valid CR, a VAT
 * certificate inside the expiry window, a verified National Address, and a roster covering
 * active / invited / disabled with one seat still free.
 */
function seed(): Stored {
  return {
    identity: {
      name: DEMO_ORG.legalName,
      type: DEMO_ORG.type,
      cr: DEMO_ORG.cr,
      vat: DEMO_ORG.vat,
      location: DEMO_ORG.location,
    },
    profile: {
      legalName: DEMO_ORG.legalName,
      tradeName: DEMO_ORG.tradeName,
      cr: DEMO_ORG.cr,
      vat: DEMO_ORG.vat,
      sector: DEMO_ORG.sector,
      companySize: DEMO_ORG.companySize,
    },
    address: { ...DEMO_ORG.address },
    documents: [
      {
        id: 'doc-cr',
        type: 'Commercial registration',
        typeKey: 'cr',
        reference: DEMO_ORG.cr,
        fileName: `CR_${DEMO_ORG.cr}.pdf`,
        status: 'valid',
        validUntil: addDays(578),
        uploadedAt: addDays(-152),
        core: true,
      },
      {
        id: 'doc-vat',
        type: 'VAT certificate',
        typeKey: 'vat',
        reference: DEMO_ORG.vat,
        fileName: `VAT_${DEMO_ORG.vat}.pdf`,
        status: 'expiring',
        validUntil: addDays(DEMO_VAT_EXPIRES_IN_DAYS),
        uploadedAt: addDays(-152),
        core: true,
      },
      {
        id: 'doc-na',
        type: 'National Address',
        typeKey: 'nationalAddress',
        reference: `${DEMO_ORG.nationalAddressCode} · ${DEMO_ORG.city}`,
        fileName: `NA_${DEMO_ORG.nationalAddressCode}.pdf`,
        status: 'valid',
        validUntil: addDays(872),
        uploadedAt: addDays(-152),
        core: true,
      },
      // Non-registry certificates: no admin decision behind them, only an expiry. SASO sits inside
      // the 30-day window on purpose so the compliance list always demonstrates an `expiring` row.
      {
        id: 'doc-saso',
        type: 'SASO Conformity',
        typeKey: 'saso',
        reference: 'Steel & rebar',
        fileName: 'SASO_conformity_steel.pdf',
        status: 'expiring',
        validUntil: addDays(5),
        uploadedAt: addDays(-300),
      },
      {
        id: 'doc-iso9001',
        type: 'ISO 9001 : 2015',
        typeKey: 'iso9001',
        reference: 'Quality management',
        fileName: 'ISO9001_2015.pdf',
        status: 'valid',
        validUntil: addDays(410),
        uploadedAt: addDays(-300),
      },
    ],
    settings: {
      notifyNewBid: true,
      notifyCounterOffer: true,
      notifyOrderStatus: true,
      notifyDocExpiry: true,
      requireCertifications: true,
      allowPartialBids: true,
    },
    plan: { name: DEMO_PLAN.name, renewsAt: addDays(506) },
    // The feed names real people and quotes the real VAT expiry — every row here is checkable
    // against the roster and the documents above.
    actions: [
      {
        id: 'oa1',
        kind: 'access',
        text: `${DEMO_DISABLED_MEMBER.name}'s access is disabled · review or remove to free a seat`,
        actionLabel: 'Review',
        primary: true,
      },
      {
        id: 'oa2',
        kind: 'renewal',
        text: `VAT certificate expires in ${DEMO_VAT_EXPIRES_IN_DAYS} days · renew to keep the organisation verified`,
        actionLabel: 'Renew',
      },
      { id: 'oa3', kind: 'inactive', text: "2 users haven't signed in for 30+ days · review access", actionLabel: 'Review' },
    ],
    // The tile is the headline of the summary beneath it, so it is the sum of that summary rather
    // than an unrelated number: 18 + 9 + 24 + 6 = 57.
    bids: { total: 57, bidding: 18, negotiating: 9 },
    payment: { receivedMtd: 'SAR 1.80M', receivable: 'SAR 400k' },
    bidSummary: { bidding: 18, negotiating: 9, won: 24, lost: 6 },
    // Outstanding (pending + overdue) is the receivable quoted on the payment tile: 190k + 210k.
    receivables: { received: 'SAR 2.80M', pending: 'SAR 190k', overdue: 'SAR 210k' },
    members: DEMO_MEMBERS.map((m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      department: m.department,
      role: m.role,
      status: m.status,
      lastActive: LAST_ACTIVE[m.lastActiveKey],
      ...('activeSinceDays' in m ? { activeSince: addDays(m.activeSinceDays) } : {}),
    })),
  }
}

/** Human "last active" notes, keyed off the roster so the wording lives in one place. */
const LAST_ACTIVE: Record<string, string> = {
  minutesAgo: '2 minutes ago',
  hourAgo: '1 hour ago',
  yesterday: 'Yesterday',
  inviteSent2d: 'Invite sent 2 days ago',
  removed: 'Removed 12 Jul',
}

function load(): Stored {
  return read() ?? write(seed())
}

/** Stored shape → what the screens read: documents reconciled, seats counted. */
function project(record: Stored): OrganisationData {
  const documents = reconcileDocs(record.documents)
  return { ...record, documents, seats: countSeats(record.members) }
}

function save(next: Stored): Promise<OrganisationData> {
  return delay(project(write(next)))
}

export const organisationApi = {
  get(): Promise<OrganisationData> {
    return delay(project(load()))
  },

  /** Company details + National Address, saved together by the profile page's one Save button. */
  saveProfile(profile: OrgProfile, address: OrgAddress): Promise<OrganisationData> {
    const record = load()
    // The identity card and the verification documents read the CR/VAT off the record, so keep
    // them in step with whatever the profile form last saved.
    return save({
      ...record,
      profile,
      address,
      identity: { ...record.identity, name: profile.legalName, cr: profile.cr, vat: profile.vat },
    })
  },

  saveSettings(settings: OrgSettings): Promise<OrganisationData> {
    return save({ ...load(), settings })
  },

  /** A freshly uploaded document is `pending` until review, so it carries no expiry yet. */
  addDocument(type: string, fileName: string): Promise<OrganisationData> {
    const record = load()
    const doc: OrgDocument = { id: id('doc'), type, fileName, status: 'pending', uploadedAt: iso(now()) }
    return save({ ...record, documents: [...record.documents, doc] })
  },

  deleteDocument(docId: string): Promise<OrganisationData> {
    const record = load()
    return save({ ...record, documents: record.documents.filter((d) => d.id !== docId) })
  },

  /**
   * Replace a document's file. The row goes back to `pending` — the current certificate stays
   * active in the eyes of verification until the new one is reviewed, which is what the dialog
   * promises, so the OLD expiry is kept on the record rather than cleared.
   */
  reuploadDocument(docId: string, fileName: string): Promise<OrganisationData> {
    const record = load()
    return save({
      ...record,
      documents: record.documents.map((d) =>
        d.id === docId ? { ...d, fileName, status: 'pending', uploadedAt: iso(now()) } : d,
      ),
    })
  },

  /** Rejects when the org is out of seats — the dialog cannot be the only thing enforcing it. */
  inviteMember(input: InviteInput): Promise<OrganisationData> {
    const record = load()
    if (countSeats(record.members).left <= 0) return Promise.reject(new Error('No seats left'))
    const member: OrgMember = {
      id: id('m'),
      name: input.name.trim(),
      email: input.email.trim(),
      department: '—',
      role: input.role,
      status: 'invited',
      lastActive: 'Invite sent just now',
    }
    return save({ ...record, members: [...record.members, member] })
  },

  setMemberRole(memberId: string, role: OrgMemberRole): Promise<OrganisationData> {
    const record = load()
    return save({ ...record, members: record.members.map((m) => (m.id === memberId ? { ...m, role } : m)) })
  },

  /** Disabling keeps the member and their history; it only frees the seat. */
  disableMember(memberId: string): Promise<OrganisationData> {
    const record = load()
    return save({
      ...record,
      members: record.members.map((m) =>
        m.id === memberId ? { ...m, status: 'disabled', lastActive: 'Disabled just now' } : m,
      ),
    })
  },

  /** Restoring takes a seat back, so it fails when the org has since filled up. */
  restoreMember(memberId: string): Promise<OrganisationData> {
    const record = load()
    if (countSeats(record.members).left <= 0) return Promise.reject(new Error('No seats left'))
    return save({
      ...record,
      members: record.members.map((m) =>
        m.id === memberId ? { ...m, status: 'active', lastActive: 'Restored just now' } : m,
      ),
    })
  },

  removeMember(memberId: string): Promise<OrganisationData> {
    const record = load()
    return save({ ...record, members: record.members.filter((m) => m.id !== memberId) })
  },

  /** Re-send a pending invitation — resets the "sent" note without touching the seat count. */
  resendInvite(memberId: string): Promise<OrganisationData> {
    const record = load()
    return save({
      ...record,
      members: record.members.map((m) =>
        m.id === memberId ? { ...m, lastActive: 'Invite sent just now' } : m,
      ),
    })
  },
}
