import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ordersApi } from '../services/ordersApi'
import type { Order, OrderIssue, OrderMessage, ReceiptLine, Shipment } from '../types'

export const orderKeys = {
  list: () => ['orders'] as const,
  supplierList: () => ['orders', 'supplier'] as const,
  detail: (id: string) => ['order', 'detail', id] as const,
}

export function useOrders() {
  return useQuery({ queryKey: orderKeys.list(), queryFn: () => ordersApi.listOrders() })
}

/** The signed-in supplier's own orders — the same records, filtered to the selling party. */
export function useSupplierOrders() {
  return useQuery({ queryKey: orderKeys.supplierList(), queryFn: () => ordersApi.listSupplierOrders() })
}

export function useOrder(id: string) {
  return useQuery({ queryKey: orderKeys.detail(id), queryFn: () => ordersApi.getOrder(id) })
}

/** Project a mutated order into the detail + list caches instead of refetching (Zero-Fetch). */
function project(qc: QueryClient, record: Order) {
  qc.setQueryData(orderKeys.detail(record.id), record)
  qc.setQueryData(orderKeys.detail(record.rfqId), record)
  // Both lists are projected: one order can appear on the buyer's AND the supplier's.
  for (const key of [orderKeys.list(), orderKeys.supplierList()]) {
    qc.setQueryData<Order[]>(key, (old) => {
      const list = old ?? []
      const i = list.findIndex((o) => o.id === record.id)
      if (i < 0) return list
      const next = list.slice()
      next[i] = record
      return next
    })
  }
}

/** Accept the purchase order — binding, and it locks the terms to the agreed offer. */
export function useAcceptPurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersApi.acceptPurchaseOrder(id),
    onSuccess: (record) => project(qc, record),
  })
}

/** Decline the purchase order — it ends, with the reason shown to the buyer in full. */
export function useDeclinePurchaseOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reasonTag, note }: { id: string; reasonTag: string; note: string }) =>
      ordersApi.declinePurchaseOrder(id, reasonTag, note),
    onSuccess: (record) => project(qc, record),
  })
}

/** Save a shipment update — visible on the buyer's order immediately. */
export function useSaveShipment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, shipment }: { id: string; shipment: Shipment }) => ordersApi.saveShipment(id, shipment),
    onSuccess: (record) => project(qc, record),
  })
}

/** Mark delivered — notifies the buyer to confirm receipt; only they can close the order. */
export function useMarkDelivered() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => ordersApi.markDelivered(id),
    onSuccess: (record) => project(qc, record),
  })
}

/** Answer the buyer's request to cancel an order this supplier already accepted. */
export function useAnswerCancellation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, outcome }: { id: string; outcome: 'agreed' | 'declined' }) =>
      ordersApi.answerCancellation(id, outcome),
    onSuccess: (record) => project(qc, record),
  })
}

export function useConfirmReceipt() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, receipt, full }: { id: string; receipt: Record<number, ReceiptLine>; full: boolean }) =>
      ordersApi.confirmReceipt(id, receipt, full),
    onSuccess: (record) => project(qc, record),
  })
}

export function useCancelOrder() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason, note }: { id: string; reason: string; note: string }) =>
      ordersApi.cancelOrder(id, reason, note),
    onSuccess: (record) => project(qc, record),
  })
}

export function useReportIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, issue }: { id: string; issue: OrderIssue }) => ordersApi.reportIssue(id, issue),
    onSuccess: (record) => project(qc, record),
  })
}

export function useAppendOrderMessage() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, message }: { id: string; message: OrderMessage }) => ordersApi.appendMessage(id, message),
    onSuccess: (record) => project(qc, record),
  })
}
