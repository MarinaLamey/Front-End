/* ────────────────────────────────────────────────────────────────────────────
 * PROFILE API — the signed-in person's own record.
 *
 * Mock-first, localStorage-backed. The session knows who you are and what seat you
 * hold; this seam owns the rest of the record — job title, mobile, preferences — and
 * seeds a plausible person per seat so each of the three profiles reads like a real
 * one rather than an empty form.
 * ──────────────────────────────────────────────────────────────────────────── */

import { DEMO_MEMBERS, DEMO_ORG, DEMO_SIGNED_IN_MEMBER } from '@/platform/demo'
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
  language: string
  timeZone: string
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
    language: 'English',
    timeZone: 'Riyadh (GMT+3)',
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
