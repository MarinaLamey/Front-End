/* ────────────────────────────────────────────────────────────────────────────
 * NEGOTIATION STATE — the five states of §2.1, resolved per side.
 *
 * The stored record keeps two things apart, exactly as §15.1 asks: whether the
 * conversation is open, and whose turn it is. Open/closed lives on
 * `NegotiationThread.status`; whose-turn is a property of the offer array — the
 * side that did NOT send the latest version is the side that owes a reply. Nothing
 * stores "whose turn" as a field, because it can only ever be one answer and a
 * stored copy could disagree with the offers it is supposed to describe.
 *
 * Both sides read the same stored state through different words, because each side
 * is being told what to do next rather than what state a record is in:
 *
 *   stored              buyer sees                supplier sees
 *   open, their turn    Awaiting supplier         Awaiting you
 *   open, your turn     Awaiting you              Awaiting buyer
 *   agreed              Agreed — issue the order  Agreed — waiting for the buyer
 *   awarded             Awarded                   Won
 *   closed              Closed                    Closed
 *
 * This replaces the older Active / Awaiting you / Closed set, which §2.1 flags as a
 * design conflict: "Active" mapped to nothing stored, there was no word for having
 * replied and waiting, and Agreed was missing entirely.
 * ──────────────────────────────────────────────────────────────────────────── */

import type { NegotiationThread } from '../types'

/** Which end of the conversation is reading. */
export type Side = 'buyer' | 'supplier'

/**
 * The five states, named from the READER's point of view. `awaitingYou` always means
 * "you owe the next move", whichever side is asking.
 */
export type NegotiationState =
  | 'awaitingYou'
  | 'awaitingOther'
  | 'agreed'
  | 'awarded'
  | 'closed'

/**
 * Resolve a thread to the state the given side sees.
 *
 * Order matters: a settled conversation is settled regardless of who spoke last, so
 * closed / awarded / agreed are all checked before the turn is considered. Reading the
 * turn first would show "Awaiting supplier" on a thread that has already been awarded.
 */
export function negotiationState(thread: NegotiationThread, side: Side): NegotiationState {
  if (thread.status === 'ended') return 'closed'
  if (thread.status === 'awarded') return 'awarded'
  if (thread.status === 'agreed') return 'agreed'
  // Open: the side that did not send the latest offer is the side that owes a reply.
  const lastBy = thread.offers[thread.offers.length - 1]?.by
  return lastBy === side ? 'awaitingOther' : 'awaitingYou'
}

/**
 * i18n key for the status chip, in the reader's own vocabulary. The two "awaiting"
 * states and `awarded` differ per side; agreed and closed differ only in their
 * qualifier, which is why each side gets its own key rather than a shared one.
 */
export function negotiationStateKey(state: NegotiationState, side: Side): string {
  const scope = side === 'buyer' ? 'rfq.nego.state.buyer' : 'rfq.nego.state.supplier'
  return `${scope}.${state}`
}

/** Chip tone. Anything that needs the reader carries the brand accent; endings go quiet. */
export function negotiationStateTone(state: NegotiationState): 'brand' | 'info' | 'success' | 'neutral' {
  switch (state) {
    case 'awaitingYou':
      return 'brand'
    case 'awaitingOther':
      return 'info'
    case 'agreed':
      return 'success'
    case 'awarded':
      return 'success'
    case 'closed':
      return 'neutral'
  }
}

/**
 * The activity sentence that sits beside every status (§2 — "every list that shows a
 * status also shows the activity sentence beside it"). Returns the key plus the values
 * it interpolates, so the caller formats the time in the active locale.
 */
export function negotiationActivity(
  thread: NegotiationThread,
  side: Side,
): { key: string; version: number } {
  const state = negotiationState(thread, side)
  const latest = thread.offers[thread.offers.length - 1]
  const version = latest?.version ?? thread.offers.length
  const mine = latest?.by === side
  const scope = side === 'buyer' ? 'rfq.nego.activity.buyer' : 'rfq.nego.activity.supplier'

  if (state === 'closed') return { key: `${scope}.closed`, version }
  if (state === 'awarded') return { key: `${scope}.awarded`, version }
  if (state === 'agreed') return { key: `${scope}.agreed`, version: thread.agreedVersion ?? version }
  // Open — the sentence names the move that was actually made, not the state.
  return { key: mine ? `${scope}.youSent` : `${scope}.theyReplied`, version }
}

/** Tab order for a list, newest-need-first: what needs you, then what you are waiting on. */
export const NEGOTIATION_STATES: NegotiationState[] = [
  'awaitingYou',
  'awaitingOther',
  'agreed',
  'awarded',
  'closed',
]
