function uuid(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}

/** Joins a whole business transaction to its eventual confirming/failing event (§6.4). */
export const newCorrelationId = () => `corr_${uuid()}`

/** De-dupes a single attempt — a duplicate must never double-charge (Principle 4). */
export const newIdempotencyKey = () => `idem_${uuid()}`
