import { submitCommand } from '@/platform/commands'
import type { CreateRfqInput, Rfq } from '../types'

const MOCK: Rfq[] = [
  { id: 'r1', title: 'Cement supply — Riyadh site', status: 'open', createdAt: '2026-06-01' },
  { id: 'r2', title: 'Steel rebar — Q3', status: 'awarded', createdAt: '2026-05-20' },
]

/** Mock read model for the RFQ list. */
export async function fetchRfqs(): Promise<Rfq[]> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return MOCK
}

/** Write: fire the command and get a 202 + correlationId — truth arrives via the socket. */
export function createRfq(input: CreateRfqInput) {
  return submitCommand('/rfqs', input, 'rfq.create')
}
