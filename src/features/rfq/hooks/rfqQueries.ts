import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { rfqApi } from '../services/rfqApi'
import type {
  NegotiationThread,
  OrderMessage,
  RfqAward,
  RfqDraft,
  RfqOutcome,
  RfqStatus,
  SupplierBidRecord,
} from '../types'

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

/**
 * Close-early / cancel — projects the new status into both the detail and list caches. A cancel
 * carries the buyer's reason so it is persisted with the record rather than dropped on the floor.
 */
export function useSetRfqStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, cancelReason }: { id: string; status: RfqStatus; cancelReason?: string }) =>
      rfqApi.setStatus(id, status, cancelReason),
    onSuccess: (record) => {
      qc.setQueryData(rfqKeys.detail(record.id), record)
      projectRecord(qc, record)
    },
  })
}

/**
 * Mark bids as opened by the buyer, which is what drops them out of the "Bids to Review" tile.
 * Fired as a side effect of reading, so it stays silent: no spinner, no toast, and a failure is
 * swallowed — the worst case is a tile that still counts a bid the buyer has seen, which is far
 * better than an error banner over a row they only expanded.
 */
export function useMarkBidsOpened() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, bidIds }: { id: string; bidIds: string[] }) => rfqApi.markBidsOpened(id, bidIds),
    onSuccess: (record) => {
      qc.setQueryData(rfqKeys.detail(record.id), record)
      projectRecord(qc, record)
    },
  })
}

/** Extend the bidding window (mock) — moves the closing date and projects it into detail + list. */
export function useExtendRfqClosing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, closingDate }: { id: string; closingDate: string }) => rfqApi.extendClosing(id, closingDate),
    onSuccess: (record) => {
      qc.setQueryData(rfqKeys.detail(record.id), record)
      projectRecord(qc, record)
    },
  })
}

/**
 * Award the RFQ — persists one award per winning supplier (split-aware) + their POs and projects
 * the returned record straight into the detail and list caches (Zero-Fetch: setQueryData, never
 * invalidate).
 */
export function useAwardRfq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, awards }: { id: string; awards: RfqAward[] }) => rfqApi.awardRfq(id, awards),
    onSuccess: (record) => {
      qc.setQueryData(rfqKeys.detail(record.id), record)
      projectRecord(qc, record)
    },
  })
}

/** Persist a negotiation thread (counter / end) — projects into the detail and list caches. */
export function useSaveNegotiation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, thread }: { id: string; thread: NegotiationThread }) =>
      rfqApi.saveNegotiation(id, thread),
    onSuccess: (record) => {
      qc.setQueryData(rfqKeys.detail(record.id), record)
      projectRecord(qc, record)
    },
  })
}

/** Save the supplier's own bid (draft / submit / decline / withdraw) — projects into both caches. */
export function useSaveSupplierBid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, bid }: { id: string; bid: SupplierBidRecord }) => rfqApi.saveSupplierBid(id, bid),
    onSuccess: (record) => {
      qc.setQueryData(rfqKeys.detail(record.id), record)
      projectRecord(qc, record)
    },
  })
}

/** Append a message to the order conversation — projects into the detail and list caches. */
export function useAppendOrderMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: OrderMessage }) =>
      rfqApi.appendOrderMessage(id, message),
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

/** Delete a never-published draft — drops it from the list cache (Zero-Fetch). */
export function useDeleteRfq() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => rfqApi.deleteRfq(id),
    onSuccess: (_void, id) => {
      qc.setQueryData<RfqDraft[]>(rfqKeys.list(), (old) => (old ?? []).filter((r) => r.id !== id))
    },
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
