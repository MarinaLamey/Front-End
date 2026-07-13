import { useEffect } from 'react'
import { socket, type DomainEvent } from '@/platform/realtime'
import { useSagaStore } from './sagaStore'

/**
 * The "reconcile" step: bridges incoming socket domain events to the saga tracker.
 * Mounted once near the root. Real impl also reconciles missed events via a
 * read-model query on reconnect (roadmap G1).
 */
export function useSagaBridge(): void {
  const resolve = useSagaStore((state) => state.resolve)

  useEffect(() => {
    const unsubscribe = socket.subscribe((event: DomainEvent) => {
      if (event.type.endsWith('.confirmed')) {
        resolve(event.correlationId, 'confirmed')
      } else if (event.type.endsWith('.failed')) {
        resolve(event.correlationId, 'failed', 'The action could not be completed.')
      }
    })
    void socket.connect()
    return unsubscribe
  }, [resolve])
}
