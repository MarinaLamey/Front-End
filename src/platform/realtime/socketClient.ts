/**
 * Socket Service client (skeleton). Real lifecycle (mandate §13): obtain a single-use
 * ticket from the gateway (separate from the access token), open WSS to the sticky LB,
 * replay from the last-seen sequence number, and fall back to a read-model query on a
 * backpressure drop. For now it's an in-memory event bus the mock command path drives.
 */
export interface DomainEvent {
  correlationId: string
  type: string
  payload: unknown
}

type Listener = (event: DomainEvent) => void

class SocketClient {
  private listeners = new Set<Listener>()
  private connected = false

  async connect(): Promise<void> {
    // TODO: ticket → WSS connect → replay buffer. No-op until the gateway exists.
    this.connected = true
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  /** Mocks/tests: push an event through as if it arrived from the backend. */
  emit(event: DomainEvent): void {
    this.listeners.forEach((listener) => listener(event))
  }

  disconnect(): void {
    this.connected = false
    this.listeners.clear()
  }

  get isConnected(): boolean {
    return this.connected
  }
}

export const socket = new SocketClient()
