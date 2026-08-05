import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import { ordersApi } from '../services/ordersApi'
import type { Order, OrderIssue, OrderMessage, ReceiptLine } from '../types'

export const orderKeys = {
  list: () => ['orders'] as const,
  detail: (id: string) => ['order', 'detail', id] as const,
}

export function useOrders() {
  return useQuery({ queryKey: orderKeys.list(), queryFn: () => ordersApi.listOrders() })
}

export function useOrder(id: string) {
  return useQuery({ queryKey: orderKeys.detail(id), queryFn: () => ordersApi.getOrder(id) })
}

/** Project a mutated order into the detail + list caches instead of refetching (Zero-Fetch). */
function project(qc: QueryClient, record: Order) {
  qc.setQueryData(orderKeys.detail(record.id), record)
  qc.setQueryData(orderKeys.detail(record.rfqId), record)
  qc.setQueryData<Order[]>(orderKeys.list(), (old) => {
    const list = old ?? []
    const i = list.findIndex((o) => o.id === record.id)
    if (i < 0) return list
    const next = list.slice()
    next[i] = record
    return next
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
