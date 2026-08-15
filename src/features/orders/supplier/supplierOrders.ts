/* ────────────────────────────────────────────────────────────────────────────
 * SUPPLIER ORDERS — the same orders, read from the other end.
 *
 * An Order records both parties, so the buyer's list and the supplier's list are two
 * filters over one dataset rather than two datasets. What differs is the question each
 * side is asking: the buyer wants to know what has arrived, the supplier wants to know
 * what is owed FROM them next.
 *
 * The supplier's tabs are therefore not the raw `OrderStatus` — "delivered" is the
 * buyer's turn, not theirs, and reads as *Awaiting buyer* here.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { Order, OrderStatus } from '../types'

/** The signed-in supplier organisation — the counterpart to the buyer org in `ordersApi`. */
export const SUPPLIER_ORG_NAME = 'Al-Rajhi Steel Industries LLC'

/** Where an order sits from the SUPPLIER's side — these are the list's tabs. */
export type SupplierOrderStage =
  | 'toReview' // PO issued, needs accepting or declining
  | 'inFulfilment' // accepted; shipment is the supplier's to move
  | 'awaitingBuyer' // delivered — the ball is with the buyer
  // The four endings are distinct (SoT §5.4): a declined order is not a cancelled one, and an
  // expired one is neither, so none of them may be filed under another's word.
  | 'closed'
  | 'cancelled'
  | 'declined'
  | 'expired'

export const SUPPLIER_STAGES: SupplierOrderStage[] = [
  'toReview',
  'inFulfilment',
  'awaitingBuyer',
  'closed',
  'cancelled',
  'declined',
  'expired',
]

/**
 * True while the buyer has asked to cancel and the supplier has not answered.
 *
 * A cancellation can only be asked for BEFORE acceptance (SoT §12): once the supplier accepts,
 * neither side can cancel and the order runs to fulfilment. The status guard is therefore part of
 * the predicate, not merely of the screen — a request left on a record that has since been
 * accepted is spent, and must never resurface as something to answer.
 */
export function awaitingCancellationAnswer(order: Order): boolean {
  return (
    order.status === 'awaiting_acceptance' &&
    order.cancellationRequest != null &&
    order.cancellationRequest.outcome == null
  )
}

/**
 * The stage drives the tab, the badge and the row's call to action. A pending cancellation
 * request outranks the underlying status: it is the thing the supplier has to answer.
 */
export function stageOf(order: Order): SupplierOrderStage {
  // The four endings stay distinct (SoT §2.2): a declined order is not a cancelled one and an
  // expired one is neither, so none may be filed under another's word.
  if (order.status === 'closed') return 'closed'
  if (order.status === 'cancelled') return 'cancelled'
  if (order.status === 'declined') return 'declined'
  if (order.status === 'expired') return 'expired'
  if (awaitingCancellationAnswer(order)) return 'toReview'
  if (order.status === 'awaiting_acceptance') return 'toReview'
  if (order.status === 'delivered') return 'awaitingBuyer'
  // Accepted-awaiting-dispatch and in-transit are both "in fulfilment" to the supplier — the order
  // is theirs to move, whether that means entering a dispatch date or updating one.
  return 'inFulfilment'
}

/** The badge the list shows — finer-grained than the stage, matching the buyer's vocabulary. */
export function supplierStatusKey(order: Order): { key: string; tone: 'warning' | 'info' | 'success' | 'danger' | 'neutral' } {
  if (awaitingCancellationAnswer(order)) return { key: 'cancellationRequested', tone: 'warning' }
  // The SUPPLIER's word for each stored state (SoT §2.2) — deliberately different from the buyer's,
  // because each side is told what to do next rather than what state the record is in.
  const byStatus: Record<OrderStatus, { key: string; tone: 'warning' | 'info' | 'success' | 'danger' | 'neutral' }> = {
    awaiting_acceptance: { key: 'toReview', tone: 'warning' },
    accepted_awaiting_dispatch: { key: 'assignDelivery', tone: 'warning' },
    in_transit: { key: 'inTransit', tone: 'info' },
    delivered: { key: 'awaitingBuyer', tone: 'neutral' },
    closed: { key: 'closed', tone: 'success' },
    cancelled: { key: 'cancelled', tone: 'danger' },
    declined: { key: 'declined', tone: 'danger' },
    expired: { key: 'expired', tone: 'danger' },
  }
  return byStatus[order.status]
}

/**
 * The plain-language next step, and who owes it. The list's whole job is to answer "what does
 * this need from me", so an order that needs nothing says who it is waiting on instead.
 */
export function nextStepKey(order: Order): string {
  if (awaitingCancellationAnswer(order)) return 'answerCancellation'
  switch (order.status) {
    case 'awaiting_acceptance':
      return 'reviewAndAccept'
    case 'accepted_awaiting_dispatch':
      return 'addDispatchDetails'
    case 'in_transit':
      return 'updateShipment'
    case 'delivered':
      return 'waitingForBuyer'
    case 'closed':
      return 'completed'
    case 'cancelled':
      return 'buyerCancelled'
    case 'declined':
      return 'youDeclined'
    case 'expired':
      return 'expired'
  }
}

/** The row's action — only an order that needs something from the supplier gets a solid button. */
export function rowAction(order: Order): { labelKey: string; primary: boolean } {
  const stage = stageOf(order)
  if (stage === 'toReview') return { labelKey: 'review', primary: true }
  if (stage === 'inFulfilment') return { labelKey: 'update', primary: true }
  return { labelKey: 'view', primary: false }
}

/** Terms lock on acceptance — after that only the buyer reopening negotiation can change them. */
export function termsLocked(order: Order): boolean {
  return order.acceptedAt != null
}

/** The date shown against a resolved order, for the list's "next step" column. */
export function resolvedAt(order: Order): string | undefined {
  return order.closedAt ?? order.cancelledAt ?? order.declinedAt
}

/** Orders belonging to the signed-in supplier, newest first. */
export function supplierOrders(orders: Order[]): Order[] {
  return orders
    .filter((order) => order.supplier.name === SUPPLIER_ORG_NAME)
    .slice()
    .sort((a, b) => b.issuedAt.localeCompare(a.issuedAt))
}

/** Tab counts across the supplier's own orders. */
export function stageCounts(orders: Order[]): Record<SupplierOrderStage | 'all', number> {
  const counts = { all: orders.length } as Record<SupplierOrderStage | 'all', number>
  for (const stage of SUPPLIER_STAGES) counts[stage] = 0
  for (const order of orders) counts[stageOf(order)] += 1
  return counts
}
