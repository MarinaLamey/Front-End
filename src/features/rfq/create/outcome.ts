/* Maps a wizard action + the org's state to a terminal outcome, and builds the summary the
 * result card shows. There is no admin-approval step — a verified org's RFQ publishes straight
 * to suppliers:
 *
 *   Save draft            → draft_saved
 *   Submit, not verified  → verify_to_publish  (saved as draft; org must pass KYB first)
 *   Submit, verified      → published          (goes live to matched suppliers immediately)
 */

import { categoryLabel, type RfqDraft, type RfqOutcome, type RfqResult } from '../types'

export interface OutcomeContext {
  /** The org has passed KYB verification. */
  verified: boolean
}

export function computeOutcome(action: 'save' | 'submit', ctx: OutcomeContext): RfqOutcome {
  if (action === 'save') return 'draft_saved'
  return ctx.verified ? 'published' : 'verify_to_publish'
}

const OUTCOME_STATUS: Record<RfqOutcome, RfqResult['status']> = {
  draft_saved: 'draft',
  // Built but not yet publishable — it sits under review and auto-publishes once the org is verified.
  verify_to_publish: 'awaiting_verification',
  published: 'live',
}

/** How many verified suppliers the RFQ would reach — a light heuristic for the result card. */
function matchedSuppliers(draft: RfqDraft): number {
  const perRegion = 4
  const regions = Math.max(draft.regions.length, 1)
  return Math.min(regions * perRegion, 12)
}

export function buildResult(draft: RfqDraft, outcome: RfqOutcome): RfqResult {
  return {
    outcome,
    reference: draft.reference,
    status: OUTCOME_STATUS[outcome],
    category: categoryLabel(draft.categories),
    closingDate: draft.closingDate,
    matchedSuppliers: matchedSuppliers(draft),
  }
}
