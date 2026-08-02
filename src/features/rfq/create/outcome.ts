/* Maps a wizard action + the org's state to one of the four terminal outcomes, and builds the
 * summary the result card shows. Keeping this pure makes the branching trivial to reason about:
 *
 *   Save draft            → draft_saved
 *   Submit, not verified  → verify_to_publish  (saved as draft; publish is gated on KYB)
 *   Submit, can publish   → published          (org admin / approver — goes live immediately)
 *   Submit, needs sign-off→ pending_approval   (regular buyer — org admin must approve)
 */

import type { RfqDraft, RfqOutcome, RfqResult } from '../types'

export interface OutcomeContext {
  /** The org has passed KYB verification. */
  verified: boolean
  /** The current user may publish without an admin's approval (org admin / approver). */
  canPublishDirectly: boolean
}

export function computeOutcome(action: 'save' | 'submit', ctx: OutcomeContext): RfqOutcome {
  if (action === 'save') return 'draft_saved'
  if (!ctx.verified) return 'verify_to_publish'
  return ctx.canPublishDirectly ? 'published' : 'pending_approval'
}

const OUTCOME_STATUS: Record<RfqOutcome, RfqResult['status']> = {
  draft_saved: 'draft',
  verify_to_publish: 'draft',
  pending_approval: 'pending_approval',
  published: 'open',
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
    category: draft.category,
    closingDate: draft.closingDate,
    matchedSuppliers: matchedSuppliers(draft),
  }
}
