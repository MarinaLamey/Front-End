import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { rfqApi } from '../services/rfqApi'
import type { RfqDraft, RfqOutcome, RfqStatus } from '../types'

export const rfqKeys = {
  list: () => ['rfqs'] as const,
  detail: (id: string) => ['rfq', 'detail', id] as const,
  addresses: () => ['rfq', 'addresses'] as const,
}

/** Saved delivery addresses for the "Deliver to" picker. */
export function useRfqAddresses() {
  return useQuery({ queryKey: rfqKeys.addresses(), queryFn: () => rfqApi.getAddresses() })
}

/** A single RFQ for the detail page. */
export function useRfq(id: string) {
  return useQuery({ queryKey: rfqKeys.detail(id), queryFn: () => rfqApi.getRfq(id) })
}

/** Close-early / cancel — projects the new status into both the detail and list caches. */
export function useSetRfqStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: RfqStatus }) => rfqApi.setStatus(id, status),
    onSuccess: (record) => {
      qc.setQueryData(rfqKeys.detail(record.id), record)
      projectRecord(qc, record)
    },
  })
}

/**
 * Project a saved/submitted record into the list cache instead of refetching (Zero-Fetch):
 * the mutation already returns the authoritative record, so we upsert it in place.
 */
function projectRecord(qc: QueryClient, record: RfqDraft) {
  qc.setQueryData<RfqDraft[]>(rfqKeys.list(), (old) => {
    const list = old ?? []
    const index = list.findIndex((r) => r.id === record.id)
    if (index >= 0) {
      const next = list.slice()
      next[index] = record
      return next
    }
    return [record, ...list]
  })
}

/** Save the working draft (Save draft + autosave). */
export function useSaveRfqDraft() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (draft: RfqDraft) => rfqApi.saveDraft(draft),
    onSuccess: (record) => projectRecord(qc, record),
  })
}

/** Finalise the RFQ under the status the outcome implies. */
export function useSubmitRfq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ draft, outcome }: { draft: RfqDraft; outcome: RfqOutcome }) =>
      rfqApi.submitRfq(draft, outcome),
    onSuccess: (record) => projectRecord(qc, record),
  })
}
