/* Orders — pure derivation helpers (no i18n, no React): money totals, the lifecycle
 * timeline, and per-status display metadata. Components translate the returned keys. */

import type { Order, OrderStatus } from './types'

/** VAT-inclusive money breakdown, SAR major units. */
export function orderTotals(order: Order): { subtotal: number; vat: number; total: number } {
  const subtotal = order.lines.reduce((sum, l) => sum + l.quantity * l.unitPriceSar, 0)
  const vat = Math.round(subtotal * 0.15 * 100) / 100
  return { subtotal, vat, total: Math.round((subtotal + vat) * 100) / 100 }
}

export type StatusTone = 'warning' | 'info' | 'success' | 'danger' | 'neutral'

/** Chip label key + tone for a status. */
export function statusMeta(status: OrderStatus): { key: string; tone: StatusTone } {
  switch (status) {
    case 'awaiting_acceptance':
      return { key: 'order.status.awaiting', tone: 'neutral' }
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
  }
}

export type StepState = 'done' | 'current' | 'pending' | 'void'
export interface TimelineStep {
  key: string
  state: StepState
  at?: string
  /** i18n key for a sub-note under the label (e.g. "Awaiting your confirmation"). */
  noteKey?: string
}

/**
 * The six-step lifecycle timeline, resolved against the order's status + timestamps.
 * Terminal cancel/decline replace the tail with a single void step.
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
    },
    {
      key: 'received',
      state: closed ? 'done' : s === 'delivered' ? 'current' : 'pending',
      at: closed ? order.closedAt : undefined,
      noteKey: s === 'delivered' ? 'order.timeline.awaitingYou' : s === 'in_transit' ? 'order.timeline.awaitingYou' : undefined,
    },
    { key: 'closed', state: closed ? 'done' : 'pending', at: order.closedAt },
  ]
}
