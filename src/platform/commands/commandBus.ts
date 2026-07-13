import { bff } from '@/platform/bff'
import { getConfig } from '@/platform/config'
import { socket } from '@/platform/realtime'
import { newCorrelationId, newIdempotencyKey } from './ids'
import { useSagaStore } from './sagaStore'

export interface CommandResult {
  correlationId: string
}

/**
 * Fire a write command. The BFF returns 202 (accepted), not the result — truth
 * arrives later via the socket. We register the pending saga up front (keyed by
 * correlationId) so the confirming/failing event resolves it, and attach an
 * idempotencyKey so retries never double-effect.
 *
 * Under mocks we emulate that two-phase shape: resolve the 202 immediately, then
 * emit a confirming domain event shortly after — the single most important thing
 * the mock layer must get right, so the UI never builds on a synchronous illusion.
 */
export async function submitCommand(
  path: string,
  payload: unknown,
  label: string,
): Promise<CommandResult> {
  const correlationId = newCorrelationId()
  const idempotencyKey = newIdempotencyKey()

  useSagaStore.getState().track(correlationId, label)

  if (getConfig().useMocks) {
    window.setTimeout(() => {
      socket.emit({ correlationId, type: `${label}.confirmed`, payload })
    }, 1200)
    return { correlationId }
  }

  await bff.post(path, payload, {
    headers: { 'x-correlation-id': correlationId, 'x-idempotency-key': idempotencyKey },
  })
  return { correlationId }
}
