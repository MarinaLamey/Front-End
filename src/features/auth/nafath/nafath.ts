import { socket } from '@/platform/realtime'

/**
 * PROVISIONAL Nafath (Saudi National SSO) types + mock.
 *
 * Intentionally minimal and LOCAL to the auth feature until the detailed Nafath
 * workflow doc lands. The flow is real-shaped though: the displayed number comes from
 * the backend (here, the mock), and the APPROVAL arrives over the Socket Service —
 * the same WebSocket path our commands use — keyed by the transactionId.
 */
export type NafathStatus =
  | 'idle'
  | 'initiating'
  | 'waiting'
  | 'completed'
  | 'rejected'
  | 'expired'

export interface NafathSession {
  transactionId: string
  /** The number the user must confirm in their Nafath app. Backend-issued (mocked here). */
  displayNumber: string
}

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Mock: initiate a Nafath auth request. Real impl: POST to the BFF, which returns the
 * number + transactionId and pushes the prompt to the user's phone.
 */
export async function initiateNafath(_nationalId: string): Promise<NafathSession> {
  await delay(600)
  const session: NafathSession = {
    transactionId: crypto.randomUUID(),
    displayNumber: String(Math.floor(Math.random() * 90) + 10),
  }

  // PROVISIONAL: stand in for the backend pushing the approval over the socket once the
  // user taps the matching number in their Nafath app. Real flow: the backend emits this
  // on the Nafath callback — we only subscribe.
  window.setTimeout(() => {
    socket.emit({ correlationId: session.transactionId, type: 'nafath.confirmed', payload: {} })
  }, 3000)

  return session
}
