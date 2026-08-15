/* ────────────────────────────────────────────────────────────────────────────
 * MESSAGE GUARD — keeps a blind marketplace blind.
 *
 * A counter-offer (or a supplier revision) carries free text, and that text is the
 * one place either side could hand over an identity the platform is deliberately
 * withholding: an email address, a phone number, a website, a company name. The
 * message is therefore validated before it can be sent, not merely discouraged by
 * placeholder copy.
 *
 * Pure and i18n-free: it returns violation KEYS, and the caller maps them to text.
 * Deliberately conservative — it aims to catch the obvious channel-jumps without
 * flagging ordinary procurement prose ("2,500 pieces by 24 Aug at 3.85").
 * ──────────────────────────────────────────────────────────────────────────── */

/** What was found in the text. One key per kind, in the order they are reported. */
export type MessageViolation = 'email' | 'phone' | 'link' | 'company'

const EMAIL = /[\w.+-]+@[\w-]+\.[\w.-]+/
const LINK = /(?:https?:\/\/|www\.)\S+|\b[\w-]{2,}\.(?:com|net|org|sa|co|io|biz)\b/i
/**
 * A legal-entity suffix is the reliable half of "no company names" — a bare trading name is
 * indistinguishable from ordinary prose, so this catches the form that identifies a company.
 */
const COMPANY =
  /\b(?:ltd|limited|llc|inc|incorporated|corp|corporation|plc|gmbh|s\.a\.r\.l|est|establishment|trading|holdings?|company|co)\b\.?/i

/**
 * A run of digits long enough to be a phone number. Saudi mobiles are 10 digits local and 12
 * international, so the bar is nine — high enough that money (97,500), quantities (4,000), dates
 * and an RFQ reference (RFQ-2026-0142, eight digits) all pass untouched.
 */
const PHONE_MIN_DIGITS = 9
const DIGIT_RUN = /[+\d][\d\s().-]{7,}\d/g

function hasPhone(text: string): boolean {
  for (const run of text.match(DIGIT_RUN) ?? []) {
    let digits = 0
    for (const ch of run) if (ch >= '0' && ch <= '9') digits += 1
    if (digits >= PHONE_MIN_DIGITS) return true
  }
  return false
}

/**
 * Every kind of contact detail present in `text`. Empty means the message may be sent.
 * Order is stable so the UI can name the first offender deterministically.
 */
export function findContactDetails(text: string): MessageViolation[] {
  const value = text.trim()
  if (!value) return []
  const found: MessageViolation[] = []
  if (EMAIL.test(value)) found.push('email')
  if (hasPhone(value)) found.push('phone')
  if (LINK.test(value)) found.push('link')
  if (COMPANY.test(value)) found.push('company')
  return found
}
