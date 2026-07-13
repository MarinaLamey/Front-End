import type {
  AvailabilityResult,
  CrRecord,
  LoginResult,
  OnboardingApi,
  OrgStatus,
  Organization,
  OtpChallenge,
  OtpChannel,
  VatRecord,
} from '../contracts'
import { ApiError } from '../errors'
import { mockDb, type StoredOrg, type StoredOtp } from './db'

/* ────────────────────────────────────────────────────────────────────────────
 * MOCK API — implements OnboardingApi against the localStorage store.
 *
 * Simulates network latency and throws typed ApiErrors. Demo error states are driven
 * by MAGIC INPUT VALUES (see docs/mock-backend.md) so a presenter controls failures
 * just by what they type — no dev UI required.
 * ──────────────────────────────────────────────────────────────────────────── */

const OTP_TTL_MS = 5 * 60_000
const OTP_RESEND_MS = 30_000
/** Demo: any registration accepts this code. Real impl would randomise + deliver. */
const DEMO_OTP = '1234'

function delay(min = 300, max = 700): Promise<void> {
  const ms = Math.round(min + Math.random() * (max - min))
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function id(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function issueOtp(orgId: string, channel: OtpChannel): StoredOtp {
  const now = Date.now()
  const otp: StoredOtp = {
    orgId,
    channel,
    code: DEMO_OTP,
    expiresAt: now + OTP_TTL_MS,
    resendAvailableAt: now + OTP_RESEND_MS,
  }
  mockDb.setOtp(otp)
  // Real life delivers the code out-of-band; for the demo, surface it in the console.
  console.info(`[mock OTP] code for ${orgId} via ${channel}: ${otp.code}`)
  return otp
}

function toChallenge(otp: StoredOtp): OtpChallenge {
  return {
    orgId: otp.orgId,
    channel: otp.channel,
    expiresAt: otp.expiresAt,
    resendAvailableAt: otp.resendAvailableAt,
  }
}

function toOrganization(o: StoredOrg): Organization {
  return {
    id: o.id,
    name: o.name,
    email: o.email,
    mobile: o.mobile,
    cr: o.cr,
    roles: o.roles,
    status: o.status,
    buyerProfile: o.buyerProfile,
    supplierProfile: o.supplierProfile,
    createdAt: o.createdAt,
  }
}

export const mockApi: OnboardingApi = {
  async checkAvailability(query) {
    await delay()
    const result: AvailabilityResult = {}
    if (query.email !== undefined) {
      result.email = mockDb.findByEmail(query.email) ? 'taken' : 'available'
    }
    if (query.mobile !== undefined) {
      result.mobile = mockDb.findByMobile(query.mobile) ? 'taken' : 'available'
    }
    if (query.cr !== undefined) {
      // Magic value '0000000000' always reads as taken (mirrors register).
      result.cr = query.cr === '0000000000' || mockDb.findByCr(query.cr) ? 'taken' : 'available'
    }
    return result
  },

  async completeRegistration(input) {
    await delay()
    if (input.cr === '0000000000' || mockDb.findByCr(input.cr)) {
      throw new ApiError('CR_EXISTS', 'This CR number is already registered.', { field: 'cr' })
    }
    if (mockDb.findByEmail(input.email)) {
      throw new ApiError('EMAIL_EXISTS', 'An account with this email already exists.', { field: 'email' })
    }
    const profile = {
      cr: input.cr,
      vat: input.vat,
      address: input.address,
      city: input.city,
      country: input.country,
      officialEmail: input.email,
      mobile: input.mobile,
      registrationDate: input.registrationDate || undefined,
      expiryDate: input.expiryDate || undefined,
      productCategories: input.productCategories,
    }
    const org: StoredOrg = {
      id: id('org'),
      name: input.organizationName,
      email: input.email,
      mobile: input.mobile,
      cr: input.cr,
      password: input.password,
      roles: input.roles,
      status: 'active',
      buyerProfile: input.roles.includes('buyer') ? profile : undefined,
      supplierProfile: input.roles.includes('supplier') ? { ...profile, supplierType: '' } : undefined,
      createdAt: Date.now(),
    }
    mockDb.insertOrg(org)
    return { orgId: org.id }
  },

  async register(input) {
    await delay()
    // Magic value '0000000000' (or any already-registered CR) → CR exists.
    if (input.cr === '0000000000' || mockDb.findByCr(input.cr)) {
      throw new ApiError('CR_EXISTS', 'This CR number is already registered.', { field: 'cr' })
    }
    if (mockDb.findByEmail(input.email)) {
      throw new ApiError('EMAIL_EXISTS', 'An account with this email already exists.', { field: 'email' })
    }
    if (mockDb.findByMobile(input.mobile)) {
      throw new ApiError('MOBILE_EXISTS', 'An account with this mobile number already exists.', {
        field: 'mobile',
      })
    }

    const channel: OtpChannel = input.preferredOtpChannel ?? 'email'
    const org: StoredOrg = {
      id: id('org'),
      name: input.organizationName,
      email: input.email,
      mobile: input.mobile,
      cr: input.cr,
      password: input.password,
      roles: input.roles,
      status: 'pending_otp',
      createdAt: Date.now(),
    }
    mockDb.insertOrg(org)
    return { orgId: org.id, otp: toChallenge(issueOtp(org.id, channel)) }
  },

  async verifyOtp(orgId, code) {
    await delay()
    const otp = mockDb.getOtp(orgId)
    if (!otp) {
      throw new ApiError('OTP_INVALID', 'No verification is in progress. Please resend the code.')
    }
    if (Date.now() > otp.expiresAt) {
      throw new ApiError('OTP_EXPIRED', 'This code has expired. Request a new one.', { field: 'otp' })
    }
    if (code.trim() !== otp.code && code.trim() !== DEMO_OTP) {
      throw new ApiError('OTP_INVALID', 'That code is incorrect.', { field: 'otp' })
    }
    mockDb.updateOrg(orgId, { status: 'pending_profile' })
    return { ok: true, status: 'pending_profile' as OrgStatus }
  },

  async resendOtp(orgId) {
    await delay(150, 400)
    const existing = mockDb.getOtp(orgId)
    if (existing && Date.now() < existing.resendAvailableAt) {
      throw new ApiError('OTP_RESEND_THROTTLED', 'Please wait a moment before requesting another code.')
    }
    const org = mockDb.getOrg(orgId)
    if (!org) throw new ApiError('NOT_FOUND', 'Registration not found.')
    return toChallenge(issueOtp(orgId, existing?.channel ?? 'email'))
  },

  async submitProfile(orgId, profile) {
    await delay()
    const org = mockDb.getOrg(orgId)
    if (!org) throw new ApiError('NOT_FOUND', 'Registration not found.')
    mockDb.updateOrg(orgId, {
      buyerProfile: profile.buyer,
      supplierProfile: profile.supplier,
      status: 'active',
    })
    return toOrganization(mockDb.getOrg(orgId) as StoredOrg)
  },

  async login(identifier, password) {
    await delay()
    const org = mockDb.findByIdentifier(identifier)
    if (!org) {
      throw new ApiError('ACCOUNT_NOT_FOUND', 'No account found for these details.', { field: 'email' })
    }
    // Magic value 'wrong' always fails; otherwise check the stored password.
    if (password === 'wrong' || org.password !== password) {
      throw new ApiError('INVALID_CREDENTIALS', 'Incorrect email or password.', { field: 'password' })
    }
    const roles: LoginResult['roles'] = org.roles
    return { orgId: org.id, roles }
  },

  async requestLoginOtp(identifier) {
    await delay()
    const org = mockDb.findByIdentifier(identifier)
    if (!org) {
      throw new ApiError('ACCOUNT_NOT_FOUND', 'No account found for this number.', { field: 'mobile' })
    }
    return toChallenge(issueOtp(org.id, 'mobile'))
  },

  async verifyLoginOtp(orgId, code) {
    await delay()
    const otp = mockDb.getOtp(orgId)
    if (!otp) {
      throw new ApiError('OTP_INVALID', 'No verification is in progress. Please resend the code.')
    }
    if (Date.now() > otp.expiresAt) {
      throw new ApiError('OTP_EXPIRED', 'This code has expired. Request a new one.', { field: 'otp' })
    }
    if (code.trim() !== otp.code && code.trim() !== DEMO_OTP) {
      throw new ApiError('OTP_INVALID', 'That code is incorrect.', { field: 'otp' })
    }
    const org = mockDb.getOrg(orgId)
    if (!org) throw new ApiError('NOT_FOUND', 'Account not found.')
    const roles: LoginResult['roles'] = org.roles
    return { orgId: org.id, roles }
  },

  async validateCr(cr): Promise<CrRecord> {
    await delay()
    // Magic value '1111111111' → not found, to demo the failure path.
    if (cr.trim() === '1111111111') {
      throw new ApiError('CR_NOT_FOUND', 'No commercial registration found for this CR number.', {
        field: 'cr',
      })
    }
    return {
      cr: cr.trim(),
      organizationName: 'MI Technologies',
      city: 'Riyadh',
      registrationStatus: 'Active',
      registrationDate: '2019-03-12',
      expiryDate: '2027-03-11',
    }
  },

  async validateVat(vat): Promise<VatRecord> {
    await delay()
    // Magic suffix '0000' → not found.
    if (vat.trim().endsWith('0000')) {
      throw new ApiError('VAT_NOT_FOUND', 'No VAT registration found for this number.', { field: 'vat' })
    }
    return {
      vat: vat.trim(),
      organizationName: 'MI Technologies',
      city: 'Riyadh',
      country: 'Saudi Arabia',
      vatRegistrationDate: '2019-04-01',
      vatRegistrationStatus: 'Active',
    }
  },
}
