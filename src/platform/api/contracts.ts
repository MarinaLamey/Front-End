import type { Portal } from '@/platform/auth'

/* ────────────────────────────────────────────────────────────────────────────
 * API CONTRACT — the boundary the whole app depends on.
 *
 * Components → hooks → this interface. The mock implementation (src/platform/api/mock)
 * fulfils it today; a real BFF client implements the SAME interface later, so swapping
 * is one line in index.ts and touches zero components. Shapes mirror the HLD v1.0
 * (Organization Master, Buyer/Supplier Profile, OTP, CR/VAT validation).
 * ──────────────────────────────────────────────────────────────────────────── */

/** Self-service onboarding is buyer/supplier only (back-office is admin-provisioned). */
export type OnboardingRole = Extract<Portal, 'buyer' | 'supplier'>
export type OtpChannel = 'email' | 'mobile'
export type OrgStatus = 'pending_otp' | 'pending_profile' | 'active'

export interface RegisterInput {
  organizationName: string
  cr: string
  mobile: string
  email: string
  password: string
  /** ['buyer'] | ['supplier'] | ['buyer','supplier'] */
  roles: OnboardingRole[]
  /** Defaults to email when omitted; OTP is delivered on this channel. */
  preferredOtpChannel?: OtpChannel
}

/** What the client may see about an OTP challenge — never the code itself. */
export interface OtpChallenge {
  orgId: string
  channel: OtpChannel
  /** epoch ms — when the code stops being valid. */
  expiresAt: number
  /** epoch ms — when "Resend" becomes available (drives the countdown). */
  resendAvailableAt: number
}

export interface LoginResult {
  orgId: string
  roles: OnboardingRole[]
}

/** Per-role organization profile captured in the onboarding wizard (HLD §6). */
export interface RoleProfileInput {
  cr: string
  vat: string
  address: string
  city: string
  country: string
  officialEmail: string
  mobile: string
  registrationDate?: string
  expiryDate?: string
  /** Buyer: preferred categories. Supplier: categories supplied. */
  productCategories: string[]
  /** Supplier only. */
  supplierType?: string
}

export interface OrgProfileInput {
  buyer?: RoleProfileInput
  supplier?: RoleProfileInput
}

export interface Organization {
  id: string
  name: string
  email: string
  mobile: string
  cr: string
  roles: OnboardingRole[]
  status: OrgStatus
  buyerProfile?: RoleProfileInput
  supplierProfile?: RoleProfileInput
  createdAt: number
}

/** CR validation output (HLD §6.3). */
export interface CrRecord {
  cr: string
  organizationName: string
  city: string
  registrationStatus: string
  registrationDate: string
  expiryDate: string
}

/** VAT validation output (HLD §6.3). */
export interface VatRecord {
  vat: string
  organizationName: string
  city: string
  country: string
  vatRegistrationDate: string
  vatRegistrationStatus: string
}

/** One-shot registration payload from the multi-step wizard (all steps at once). */
export interface CompleteRegistrationInput {
  roles: OnboardingRole[]
  email: string
  mobile: string
  password: string
  organizationName: string
  cr: string
  vat: string
  address: string
  city: string
  country: string
  registrationDate: string
  expiryDate: string
  productCategories: string[]
}

export type Availability = 'available' | 'taken'

/** Identifiers to check for prior registration. Pass only the ones you want checked. */
export interface AvailabilityQuery {
  email?: string
  mobile?: string
  cr?: string
}

/** Per-identifier outcome. A field is absent unless it was in the query. */
export interface AvailabilityResult {
  email?: Availability
  mobile?: Availability
  cr?: Availability
}

/**
 * OnboardingApi — the registration / OTP / login / profile / validation surface.
 * Async by contract (mirrors the BFF). Rejections are always {@link ApiError}.
 */
export interface OnboardingApi {
  /**
   * Fail-fast uniqueness check so the wizard can reject a taken email/mobile/CR at the
   * step that OWNS it — not at final submit. A safety net; `completeRegistration` still
   * guards against a value taken mid-session.
   */
  checkAvailability(query: AvailabilityQuery): Promise<AvailabilityResult>
  /** Create the org + profiles from the full wizard payload (used by the 4-step flow). */
  completeRegistration(input: CompleteRegistrationInput): Promise<{ orgId: string }>
  register(input: RegisterInput): Promise<{ orgId: string; otp: OtpChallenge }>
  verifyOtp(orgId: string, code: string): Promise<{ ok: true; status: OrgStatus }>
  resendOtp(orgId: string): Promise<OtpChallenge>
  submitProfile(orgId: string, profile: OrgProfileInput): Promise<Organization>
  login(identifier: string, password: string): Promise<LoginResult>
  /** Passwordless phone login: send an OTP to a registered mobile/email. */
  requestLoginOtp(identifier: string): Promise<OtpChallenge>
  /** Verify the phone-login OTP → resolves the session (like `login`). */
  verifyLoginOtp(orgId: string, code: string): Promise<LoginResult>
  validateCr(cr: string): Promise<CrRecord>
  validateVat(vat: string): Promise<VatRecord>
}
