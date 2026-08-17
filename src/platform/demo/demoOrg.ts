/* ────────────────────────────────────────────────────────────────────────────
 * DEMO IDENTITY — the one place the signed-in organisation is described.
 *
 * Every mock store that needs to name "us" reads from here: the organisation record, the orders
 * store (and the purchase-order PDF), the verification request, and both dashboards. Before this
 * existed the same org was called four different things with two different CR numbers depending on
 * which screen you were looking at.
 *
 * NOT the tenant. `tenant.name` is the PLATFORM brand ("MI-Proc") used in sign-in and marketing
 * copy; this is the customer organisation using it. Never overlay one on the other.
 * ──────────────────────────────────────────────────────────────────────────── */

/** The organisation the demo signs you in as — buyer and supplier both. */
export const DEMO_ORG = {
  legalName: 'Al-Faisal Contracting Co.',
  tradeName: 'Al-Faisal',
  /** Registered role(s), shown as the identity chip on the Organisation overview. */
  type: 'Buyer & Supplier',
  cr: '1010229481',
  vat: '300012938400003',
  sector: 'Construction',
  companySize: '51 to 200 employees',
  city: 'Riyadh',
  /** "Riyadh, Saudi Arabia" — the one-line location on identity cards. */
  location: 'Riyadh, Saudi Arabia',
  /** National Address short code, quoted on the verification rows. */
  nationalAddressCode: 'RIYD2547',
  address: {
    buildingNumber: '2547',
    street: 'King Fahd Road',
    secondaryNumber: '8834',
    district: 'Al Olaya',
    city: 'Riyadh',
    postalCode: '12244',
  },
  /** Email domain every member of this org uses. */
  emailDomain: 'alfaisal.com.sa',
} as const

/** Seats per org on the demo plan (HLD: 5 on Growth). */
export const DEMO_SEAT_LIMIT = 5

export const DEMO_PLAN = { name: 'Growth' } as const

/**
 * The org roster. One list so the Users table, the Organisation overview, the action feed and the
 * signed-in user can never disagree about who works here or who is disabled.
 *
 * `status`: an invited member holds a seat; a disabled one does not.
 */
export const DEMO_MEMBERS = [
  {
    id: 'm1',
    name: 'Noura Al-Harbi',
    email: `noura@${DEMO_ORG.emailDomain}`,
    department: 'Management',
    role: 'Org Admin',
    status: 'active',
    /** Days before "now" — resolved to a date by whichever store seeds it. */
    activeSinceDays: -184,
    lastActiveKey: 'minutesAgo',
  },
  {
    id: 'm2',
    name: 'Sara Al-Dossary',
    email: `sara@${DEMO_ORG.emailDomain}`,
    department: 'Procurement',
    role: 'Buyer',
    status: 'active',
    activeSinceDays: -154,
    lastActiveKey: 'hourAgo',
  },
  {
    id: 'm3',
    name: 'Omar Al-Zahrani',
    email: `omar@${DEMO_ORG.emailDomain}`,
    department: 'Sales',
    role: 'Supplier',
    status: 'active',
    activeSinceDays: -133,
    lastActiveKey: 'yesterday',
  },
  {
    id: 'm4',
    name: 'Fahad Al-Mutairi',
    email: `fahad@${DEMO_ORG.emailDomain}`,
    department: 'Operations',
    role: 'Both',
    status: 'invited',
    lastActiveKey: 'inviteSent2d',
  },
  {
    id: 'm5',
    name: 'Layla Al-Qahtani',
    email: `layla@${DEMO_ORG.emailDomain}`,
    department: 'Finance',
    role: 'Buyer',
    status: 'disabled',
    lastActiveKey: 'removed',
  },
] as const

/** The member the demo signs you in as — the Org Admin, since the header chip says so. */
export const DEMO_SIGNED_IN_MEMBER = DEMO_MEMBERS[0]

/** The one disabled member, named by the "free a seat" action on the Organisation overview. */
export const DEMO_DISABLED_MEMBER = DEMO_MEMBERS.find((m) => m.status === 'disabled')!

/**
 * Days until the VAT certificate lapses. Quoted by the profile document row, the verification
 * rail's amber note and the overview's renewal action — one number so they cannot disagree.
 */
export const DEMO_VAT_EXPIRES_IN_DAYS = 21
