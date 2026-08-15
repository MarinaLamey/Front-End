import type { BadgeTone } from '@/shared/ui/dashboard'
import type { DocStatus, VerificationStatus } from '@/platform/api/verification'

/**
 * How a verification status is labelled and coloured, in ONE place.
 *
 * The organisation has a single verification state — the one the back-office admin decides, stored
 * on the `OrgVerification` record and derived from its per-document decisions. Every screen that
 * shows "is this organisation verified?" (portal header pill, dashboard banner, Organisation
 * overview, Organisation profile) reads that same record; nothing keeps a second copy and nothing
 * hardcodes a state. Tone is forced rather than inferred from the label, because the label is
 * localised and `StatusBadge` can only infer a tone from English.
 */
export const VERIFICATION_BADGE: Record<VerificationStatus, { key: string; tone: BadgeTone }> = {
  pending: { key: 'dashboard.status.pending', tone: 'warning' },
  verified: { key: 'dashboard.status.verified', tone: 'success' },
  rejected: { key: 'dashboard.status.rejected', tone: 'danger' },
}

/** The same, for one document's review state within the request. */
export const DOC_BADGE: Record<DocStatus, { key: string; tone: BadgeTone }> = {
  verifying: { key: 'dashboard.status.verifying', tone: 'warning' },
  verified: { key: 'dashboard.status.verified', tone: 'success' },
  rejected: { key: 'dashboard.status.rejected', tone: 'danger' },
}
