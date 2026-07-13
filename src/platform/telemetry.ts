/**
 * Browser telemetry (skeleton). Real impl emits OpenTelemetry traces into Elastic APM
 * and propagates the W3C `traceparent` header; correlationId then rides the Kafka
 * envelope server-side, making an action traceable from tap to ledger entry (§14.4).
 */
export function initTelemetry(): void {
  // TODO: configure the OTel browser SDK + APM RUM endpoint from runtime config.
}

export function recordError(error: unknown): void {
  if (import.meta.env.DEV) console.error('[telemetry]', error)
}
