/* ────────────────────────────────────────────────────────────────────────────
 * PROFILE API — the signed-in person's own record.
 *
 * Mock-first, localStorage-backed. The session knows who you are and what seat you
 * hold; this seam owns the rest of the record — job title, mobile, preferences — and
 * seeds a plausible person per seat so each of the three profiles reads like a real
 * one rather than an empty form.
 * ──────────────────────────────────────────────────────────────────────────── */

import { DEMO_MEMBERS, DEMO_ORG, DEMO_SIGNED_IN_MEMBER } from '@/platform/demo'
import { ApiError } from '@/platform/api'
import { isStrongPassword } from '@/shared/lib/validators'
import type { Seat } from '@/platform/auth'

const STORE_KEY = 'miproc.profile.v1'
const LATENCY = 320

/** How mimony is allowed to reach this person. SMS carries sign-in codes and cannot be turned off. */
export interface ContactPreferences {
  email: boolean
  inApp: boolean
}

export interface Profile {
  fullName: string
  jobTitle: string
  email: string
  /** Saudi mobile, stored as the 9 digits after +966. */
  mobile: string
  organisation: string
  /** ISO month this person joined the organisation. */
  memberSince: string
  passwordChangedAt: string
  contact: ContactPreferences
}

function delay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), LATENCY))
}

/** The org roster's word for a seat — the two vocabularies meet here and nowhere else. */
const MEMBER_ROLE: Record<Seat, string> = {
  orgAdmin: 'Org Admin',
  buyer: 'Buyer',
  supplier: 'Supplier',
  viewer: 'Viewer',
}

/** Job title and mobile are profile data, not roster data, so they live here keyed by seat. */
const SEAT_DETAILS: Record<Seat, { jobTitle: string; mobile: string }> = {
  orgAdmin: { jobTitle: 'Head of Procurement', mobile: '512345678' },
  buyer: { jobTitle: 'Procurement Officer', mobile: '533221144' },
  supplier: { jobTitle: 'Sales Manager', mobile: '556677889' },
  viewer: { jobTitle: 'Analyst', mobile: '501122334' },
}

/**
 * The person holding each seat, READ OFF the organisation roster rather than restated here — the
 * demo org is a single company registered as both buyer and supplier, so every seat is a colleague
 * at {@link DEMO_ORG}, not a different company. Inventing names here is how the Users table and the
 * profile end up disagreeing about who works where.
 */
function seedFor(seat: Seat): Profile {
  const member =
    DEMO_MEMBERS.find((m) => m.role === MEMBER_ROLE[seat] && m.status === 'active') ?? DEMO_SIGNED_IN_MEMBER
  const details = SEAT_DETAILS[seat]
  return {
    fullName: member.name,
    jobTitle: details.jobTitle,
    email: member.email,
    mobile: details.mobile,
    organisation: DEMO_ORG.legalName,
    memberSince: '2026-01',
    passwordChangedAt: '2026-06-14',
    contact: { email: true, inApp: seat !== 'viewer' },
  }
}

/** Saved edits are kept per seat, so switching seats doesn't inherit the other person's details. */
function readStore(): Partial<Record<Seat, Profile>> {
  try {
    const raw = localStorage.getItem(STORE_KEY)
    return raw ? (JSON.parse(raw) as Partial<Record<Seat, Profile>>) : {}
  } catch {
    return {}
  }
}

function writeStore(records: Partial<Record<Seat, Profile>>): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(records))
  } catch {
    /* storage unavailable — ignore */
  }
}

export const profileApi = {
  /**
   * The signed-in person's profile. `identity` is what the session already knows — it wins over the
   * seed for a real registered user, so someone who just signed up sees their own name, not Noura's.
   */
  getProfile(seat: Seat, identity?: { name?: string; email?: string }): Promise<Profile> {
    const saved = readStore()[seat]
    const base = saved ?? seedFor(seat)
    if (saved) return delay(base)
    return delay({
      ...base,
      fullName: identity?.name?.trim() || base.fullName,
      email: identity?.email?.trim() || base.email,
    })
  },

  /** Persist the edited profile for this seat. */
  saveProfile(seat: Seat, profile: Profile): Promise<Profile> {
    writeStore({ ...readStore(), [seat]: profile })
    return delay(profile)
  },
}

/* ────────────────────────────────────────────────────────────────────────────
 * VERIFIED CHANGES — email, phone, password.
 *
 * None of the three is an ordinary form field, which is why none of them goes through
 * saveProfile: the live value is left ALONE until a code sent to the new destination
 * comes back correct. Someone who mistypes their email keeps the address they can still
 * receive mail at.
 * ──────────────────────────────────────────────────────────────────────────── */

/** Which channel a code goes out on. Email codes are 6 digits, SMS 4. */
export type ContactChannel = 'email' | 'sms'

/**
 * The code the demo accepts, per channel — the same trick the auth mock plays with its DEMO_OTP.
 * Nothing is really sent anywhere, but a WRONG code still has to fail, or the dialog's error state
 * could never be seen.
 */
const DEMO_CODES: Record<ContactChannel, string> = { email: '123456', sms: '1234' }

/** How long a code stays good — the five minutes the dialog promises. */
const CODE_TTL = 5 * 60 * 1000

interface Challenge {
  destination: string
  expiresAt: number
}

/**
 * Codes waiting to be entered, keyed by seat + what they are changing. Deliberately in memory and
 * NOT in localStorage: an unconfirmed change must not outlive the tab it was started in.
 */
const challenges = new Map<string, Challenge>()

/** Reset tokens handed out by verifyPasswordCode; each is spendable exactly once. */
const resetTokens = new Set<string>()

const challengeKey = (seat: Seat, subject: string) => `${seat}:${subject}`

function issue(seat: Seat, subject: string, destination: string): void {
  challenges.set(challengeKey(seat, subject), { destination, expiresAt: Date.now() + CODE_TTL })
}

/** Check a code against the live challenge and consume it, failing the way the real one would. */
function redeem(seat: Seat, subject: string, code: string, expected: string): Challenge {
  const key = challengeKey(seat, subject)
  const challenge = challenges.get(key)
  if (!challenge) throw new ApiError('OTP_INVALID', 'No verification is in progress. Please resend the code.')
  if (Date.now() > challenge.expiresAt) {
    challenges.delete(key)
    throw new ApiError('OTP_EXPIRED', 'This code has expired. Request a new one.', { field: 'otp' })
  }
  if (code.trim() !== expected) throw new ApiError('OTP_INVALID', 'That code is incorrect.', { field: 'otp' })
  challenges.delete(key)
  return challenge
}

/** The stored record for a seat, or the seed if this seat has never been saved. */
function storedProfile(seat: Seat): Profile {
  return readStore()[seat] ?? seedFor(seat)
}

function commit(seat: Seat, profile: Profile): Profile {
  writeStore({ ...readStore(), [seat]: profile })
  return profile
}

export const profileSecurityApi = {
  /** Email/phone step 1 — send a code to the NEW destination. The live value is untouched. */
  async sendContactCode(seat: Seat, channel: ContactChannel, destination: string): Promise<void> {
    await delay(undefined)
    issue(seat, channel, destination)
  },

  /** Email/phone step 2 — the code proves the new destination is reachable, so the change lands. */
  async confirmContactCode(seat: Seat, channel: ContactChannel, code: string): Promise<Profile> {
    await delay(undefined)
    const { destination } = redeem(seat, channel, code, DEMO_CODES[channel])
    const current = storedProfile(seat)
    return commit(seat, channel === 'email' ? { ...current, email: destination } : { ...current, mobile: destination })
  },

  /**
   * Password step 1 — send a code to the address already on file, and say where it went so the
   * dialog can name it. Mirrors POST /auth/forgot-password.
   */
  async sendPasswordCode(seat: Seat): Promise<string> {
    await delay(undefined)
    const { email } = storedProfile(seat)
    issue(seat, 'password', email)
    return email
  },

  /** Password step 2 — trade the code for a single-use token. Mirrors /auth/verify-password-reset. */
  async verifyPasswordCode(seat: Seat, code: string): Promise<string> {
    await delay(undefined)
    redeem(seat, 'password', code, DEMO_CODES.email)
    const token = `mock-reset-${seat}-${Date.now()}`
    resetTokens.add(token)
    return token
  },

  /**
   * Password step 3 — spend the token. Mirrors POST /auth/reset-password, including its password
   * policy, so a password this accepts is one the real endpoint would accept too. Nothing here
   * stores a password; the only part of the change the screen can observe is the date it happened.
   */
  async setPassword(seat: Seat, resetToken: string, newPassword: string): Promise<Profile> {
    await delay(undefined)
    if (!resetTokens.delete(resetToken)) {
      throw new ApiError('OTP_INVALID', 'This verification is no longer valid. Start again.')
    }
    if (!isStrongPassword(newPassword)) {
      throw new ApiError('VALIDATION_FAILED', 'That password does not meet the policy.', { field: 'password' })
    }
    return commit(seat, { ...storedProfile(seat), passwordChangedAt: new Date().toISOString().slice(0, 10) })
  },
}
