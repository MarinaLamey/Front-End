/* ────────────────────────────────────────────────────────────────────────────
 * BID RECORD — turning what's on screen into what gets persisted.
 *
 * Every supplier action (save draft, submit, decline, withdraw, change your mind)
 * writes the whole `SupplierBidRecord`, never a partial one, so the store always
 * holds a complete bid. These builders start from the current derived view, so an
 * action that only changes the status keeps the pricing the supplier already entered.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { SupplierBidRecord, SupplierBidStatus } from '../types'
import type { SupplierRfqView } from './deriveSupplierBid'

/** The record as it stands, with `patch` applied on top. */
export function bidRecordFrom(
  view: SupplierRfqView,
  patch: Partial<SupplierBidRecord> & { status: SupplierBidStatus },
): SupplierBidRecord {
  const { bid } = view
  return {
    lines: bid.lines,
    validUntil: bid.validUntil,
    paymentTermsLabel: bid.paymentTermsLabel,
    paymentTermsKind: bid.paymentTermsKind,
    attachments: bid.attachments,
    submittedAt: bid.submittedAt,
    withdrawReason: bid.withdrawReason,
    updatedAt: new Date().toISOString(),
    ...patch,
  }
}

/** A status-only change that leaves the pricing untouched (decline, un-decline, withdraw). */
export function toDraftRecord(view: SupplierRfqView, status: SupplierBidStatus): SupplierBidRecord {
  return bidRecordFrom(view, { status })
}
