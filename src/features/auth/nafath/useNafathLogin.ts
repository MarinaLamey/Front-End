import { useEffect, useRef, useState } from 'react'
import { socket, type DomainEvent } from '@/platform/realtime'
import { initiateNafath, type NafathSession, type NafathStatus } from './nafath'

/**
 * PROVISIONAL Nafath login state machine.
 *
 * initiate → waiting (show the number) → resolve on the Socket Service event for THIS
 * transaction. The real flow swaps only the mock initiate/emit; this subscribe-and-
 * reconcile shape is exactly what the doc describes (push, not poll).
 */
export function useNafathLogin() {
  const [status, setStatus] = useState<NafathStatus>('idle')
  const [session, setSession] = useState<NafathSession | null>(null)
  const transactionId = useRef<string | null>(null)

  useEffect(() => {
    const unsubscribe = socket.subscribe((event: DomainEvent) => {
      if (event.correlationId !== transactionId.current) return
      if (event.type === 'nafath.confirmed') setStatus('completed')
      else if (event.type === 'nafath.rejected') setStatus('rejected')
      else if (event.type === 'nafath.expired') setStatus('expired')
    })
    void socket.connect()
    return unsubscribe
  }, [])

  const start = async (nationalId: string) => {
    setStatus('initiating')
    const next = await initiateNafath(nationalId)
    transactionId.current = next.transactionId
    setSession(next)
    setStatus('waiting')
  }

  return { status, session, start }
}
