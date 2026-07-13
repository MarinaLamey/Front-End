import { useState } from 'react'
import { useSagaStore, type SagaStatus } from '@/platform/commands'
import { createRfq } from '../services/rfqService'
import type { CreateRfqInput } from '../types'

/**
 * Drives one RFQ-create transaction. submit() fires the command (202) and tracks the
 * correlationId; the saga store reflects pending → confirmed|failed as the socket
 * event arrives — pending is a first-class state, never an error.
 */
export function useCreateRfq() {
  const [correlationId, setCorrelationId] = useState<string | null>(null)
  const entry = useSagaStore((state) => (correlationId ? state.entries[correlationId] : undefined))

  const submit = async (input: CreateRfqInput) => {
    const result = await createRfq(input)
    setCorrelationId(result.correlationId)
  }

  const status: 'idle' | SagaStatus = entry?.status ?? 'idle'
  return { submit, status }
}
