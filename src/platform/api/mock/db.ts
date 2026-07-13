import type { OnboardingRole, OrgStatus, OtpChannel, RoleProfileInput } from '../contracts'

/* ────────────────────────────────────────────────────────────────────────────
 * MOCK STORE — localStorage-persisted, in-memory cached.
 *
 * Survives refresh so demos keep state across navigation. Seeded with demo orgs so
 * login works on first load. Tables mirror the HLD. Reset via mockDb.reset().
 * This is mock-only infra — passwords in plaintext etc. are NEVER acceptable for real.
 * ──────────────────────────────────────────────────────────────────────────── */

const STORAGE_KEY = 'miproc.mockdb.v1'

export interface StoredOtp {
  orgId: string
  channel: OtpChannel
  code: string
  expiresAt: number
  resendAvailableAt: number
}

export interface StoredOrg {
  id: string
  name: string
  email: string
  mobile: string
  cr: string
  /** Mock only. */
  password: string
  roles: OnboardingRole[]
  status: OrgStatus
  buyerProfile?: RoleProfileInput
  supplierProfile?: RoleProfileInput
  createdAt: number
}

interface MockDb {
  version: 1
  organizations: Record<string, StoredOrg>
  otp: Record<string, StoredOtp>
}

/** Demo accounts so login + the dual-role split work the moment the app loads. */
function seedDb(): MockDb {
  const now = Date.now()
  const orgs: StoredOrg[] = [
    {
      id: 'org_demo_dual',
      name: 'MI Technologies',
      email: 'demo@mi-proc.sa',
      mobile: '+966500000000',
      cr: '1010101010',
      password: 'password',
      roles: ['buyer', 'supplier'],
      status: 'active',
      createdAt: now,
    },
    {
      id: 'org_demo_buyer',
      name: 'Acme Buyer Co',
      email: 'buyer@demo.sa',
      mobile: '+966500000001',
      cr: '2020202020',
      password: 'password',
      roles: ['buyer'],
      status: 'active',
      createdAt: now,
    },
  ]
  return {
    version: 1,
    organizations: Object.fromEntries(orgs.map((o) => [o.id, o])),
    otp: {},
  }
}

let cache: MockDb | null = null

function load(): MockDb {
  if (cache) return cache
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw) as MockDb
      if (parsed?.version === 1) {
        cache = parsed
        return cache
      }
    }
  } catch {
    /* corrupt/unavailable storage → fall through to a fresh seed */
  }
  cache = seedDb()
  persist()
  return cache
}

function persist(): void {
  if (!cache) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cache))
  } catch {
    /* quota/unavailable — the in-memory cache still serves this session */
  }
}

export const mockDb = {
  orgs(): StoredOrg[] {
    return Object.values(load().organizations)
  },
  getOrg(id: string): StoredOrg | undefined {
    return load().organizations[id]
  },
  /** Match by email (case-insensitive) or exact mobile. */
  findByIdentifier(identifier: string): StoredOrg | undefined {
    const email = identifier.trim().toLowerCase()
    const mobile = identifier.trim()
    return mockDb.orgs().find((o) => o.email.toLowerCase() === email || o.mobile === mobile)
  },
  findByCr(cr: string): StoredOrg | undefined {
    return mockDb.orgs().find((o) => o.cr === cr.trim())
  },
  findByEmail(email: string): StoredOrg | undefined {
    const e = email.trim().toLowerCase()
    return mockDb.orgs().find((o) => o.email.toLowerCase() === e)
  },
  findByMobile(mobile: string): StoredOrg | undefined {
    const m = mobile.trim()
    return mockDb.orgs().find((o) => o.mobile === m)
  },
  insertOrg(org: StoredOrg): void {
    const db = load()
    db.organizations[org.id] = org
    persist()
  },
  updateOrg(id: string, patch: Partial<StoredOrg>): void {
    const db = load()
    const current = db.organizations[id]
    if (!current) return
    db.organizations[id] = { ...current, ...patch }
    persist()
  },
  getOtp(orgId: string): StoredOtp | undefined {
    return load().otp[orgId]
  },
  setOtp(otp: StoredOtp): void {
    const db = load()
    db.otp[otp.orgId] = otp
    persist()
  },
  /** Wipe back to the seed (dev/demo affordance). */
  reset(): void {
    cache = seedDb()
    persist()
  },
}
