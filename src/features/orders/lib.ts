/* Orders — pure derivation helpers (no i18n, no React): money totals, the lifecycle
 * timeline, and per-status display metadata. Components translate the returned keys. */

import { priceTotals } from '@/features/rfq/vat'
import type { Order, OrderMilestone, OrderMilestoneTrigger, OrderStatus } from './types'

/**
 * The order's money breakdown, SAR major units — the SAME rule as bidding and negotiation: agreed
 * unit prices are VAT-INCLUSIVE, so the priced line-sum IS the total and the subtotal is divided
 * back out of it. Nothing is added on top. The lines are the authority, since the purchase order
 * carries per-line agreed prices; `agreedTotalSar` is a denormalised headline and is only trusted
 * when it agrees with them, so a stale one can never make `subtotal + vat` disagree with `total`.
 */
export function orderTotals(order: Order): { subtotal: number; vat: number; total: number } {
  const lineSum = Math.round(order.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceSar, 0) * 100) / 100
  const agreed = order.agreedTotalSar
  const total = agreed != null && Math.abs(agreed - lineSum) < 1 ? agreed : lineSum
  return priceTotals(total)
}

/* ── Payment schedule ─────────────────────────────────────────────────────────
 * The PO's payment schedule as displayable rows. Uses the order's structured milestones when present,
 * otherwise parses the "30 / 60 / 10" terms label into the standard triggers. Returns [] for
 * non-percentage terms (e.g. "Monthly") so the card hides. Each amount is `percent% × order total`. */
const DERIVED_TRIGGERS: OrderMilestoneTrigger[] = ['on_confirmation', 'on_delivery', 'on_inspection', 'on_installation']

export interface MilestoneRow {
  trigger: OrderMilestoneTrigger
  percent: number
  amount: number
}

export function paymentSchedule(order: Order): MilestoneRow[] {
  const { total } = orderTotals(order)
  const milestones: OrderMilestone[] =
    order.paymentMilestones ?? deriveMilestonesFromLabel(order.paymentTermsLabel)
  return milestones.map((m) => ({ trigger: m.trigger, percent: m.percent, amount: Math.round((m.percent / 100) * total) }))
}

function deriveMilestonesFromLabel(label: string): OrderMilestone[] {
  const parts = label.split('/').map((p) => Number(p.trim()))
  if (parts.length < 2 || parts.length > 4 || parts.some((n) => !Number.isFinite(n) || n <= 0)) return []
  if (Math.round(parts.reduce((a, b) => a + b, 0)) !== 100) return []
  return parts.map((percent, i) => ({ trigger: DERIVED_TRIGGERS[i] ?? 'on_delivery', percent }))
}

/* ── Anonymity ────────────────────────────────────────────────────────────────
 * SoT §1 + v1.1 #1: BOTH identities are revealed when the supplier ACCEPTS the purchase order — not
 * at award. So acceptance is the single gate: every state at or past acceptance is revealed, and
 * every state that never reached it (awaiting, cancelled, declined, expired) never reveals anyone. */
const REVEALED_STATUSES = new Set<OrderStatus>([
  'accepted_awaiting_dispatch',
  'in_transit',
  'delivered',
  'closed',
])

export function isSupplierRevealed(order: Order): boolean {
  return REVEALED_STATUSES.has(order.status)
}

/** The supplier's display name for the current reveal state — real name once accepted, else the anon label. */
export function supplierDisplayName(order: Order): string {
  return isSupplierRevealed(order) ? order.supplier.name : order.supplierAnonLabel ?? order.supplierShort
}

/** Short form for compact places (list rows). */
export function supplierDisplayShort(order: Order): string {
  return isSupplierRevealed(order) ? order.supplierShort : order.supplierAnonLabel ?? order.supplierShort
}

export type StatusTone = 'warning' | 'info' | 'success' | 'danger' | 'neutral'

/** Chip label key + tone for a status, in the BUYER's words (SoT §2.2). */
export function statusMeta(status: OrderStatus): { key: string; tone: StatusTone } {
  switch (status) {
    case 'awaiting_acceptance':
      return { key: 'order.status.awaiting', tone: 'neutral' }
    case 'accepted_awaiting_dispatch':
      return { key: 'order.status.acceptedAwaitingDispatch', tone: 'info' }
    case 'in_transit':
      return { key: 'order.status.inTransit', tone: 'info' }
    case 'delivered':
      return { key: 'order.status.delivered', tone: 'warning' }
    case 'closed':
      return { key: 'order.status.closed', tone: 'success' }
    case 'cancelled':
      return { key: 'order.status.cancelled', tone: 'danger' }
    case 'declined':
      return { key: 'order.status.declined', tone: 'danger' }
    case 'expired':
      return { key: 'order.status.expired', tone: 'danger' }
  }
}

export type StepState = 'done' | 'current' | 'pending' | 'void'
export interface TimelineStep {
  key: string
  state: StepState
  at?: string
  /** i18n key for a sub-note under the label (e.g. "Awaiting your confirmation"). */
  noteKey?: string
  /**
   * Interpolation for {@link noteKey} — currently only the expected-arrival date. Kept as raw ISO
   * so the component formats it in the active locale rather than this pure helper guessing one.
   */
  noteDate?: string
}

/**
 * The FIVE-step lifecycle timeline (SoT §2.3), resolved against the order's status + timestamps.
 * Terminal cancel/decline replace the tail with a single ended step.
 *
 * Five, not six: receiving the goods and closing the order are the SAME event — the buyer's
 * confirmation is what closes it — so they share one step and one timestamp (`closedAt`). An earlier
 * build drew them as two rows, which implied a step between them that does not exist.
 */
export function timeline(order: Order): TimelineStep[] {
  const s = order.status

  if (s === 'cancelled') {
    return [
      { key: 'issued', state: 'done', at: order.issuedAt },
      { key: 'cancelled', state: 'void', at: order.cancelledAt },
    ]
  }
  if (s === 'declined') {
    return [
      { key: 'issued', state: 'done', at: order.issuedAt },
      { key: 'declined', state: 'void', at: order.declinedAt },
    ]
  }

  const accepted = Boolean(order.acceptedAt)
  const shipped = Boolean(order.shipment.dispatchedAt)
  const delivered = s === 'delivered' || s === 'closed'
  const closed = s === 'closed'

  return [
    { key: 'issued', state: 'done', at: order.issuedAt },
    {
      key: 'accepted',
      state: accepted ? 'done' : s === 'awaiting_acceptance' ? 'current' : 'pending',
      at: order.acceptedAt,
      noteKey: !accepted && s === 'awaiting_acceptance' ? 'order.timeline.awaitingSupplier' : undefined,
    },
    {
      key: 'shipped',
      state: shipped ? 'done' : 'pending',
      at: order.shipment.dispatchedAt,
    },
    {
      key: 'delivered',
      state: closed ? 'done' : delivered ? 'done' : s === 'in_transit' ? 'current' : 'pending',
      at: order.shipment.deliveredAt,
      noteKey: s === 'in_transit' && !order.shipment.deliveredAt ? 'order.timeline.expected' : undefined,
      noteDate: order.shipment.expectedArrival,
    },
    {
      // Received AND closed — one step. Its timestamp is `closedAt`, because the buyer's
      // confirmation is the event. Before it happens the note names who is being waited on.
      key: 'receivedClosed',
      state: closed ? 'done' : s === 'delivered' ? 'current' : 'pending',
      at: order.closedAt,
      noteKey:
        s === 'delivered'
          ? 'order.timeline.yourConfirmation'
          : s === 'in_transit'
            ? 'order.timeline.awaitingYou'
            : undefined,
    },
  ]
}
