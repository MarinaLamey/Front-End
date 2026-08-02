import { useQuery } from '@tanstack/react-query'
import { rfqApi } from '../services/rfqApi'
import { rfqKeys } from './rfqQueries'

/** The buyer's RFQ list read-model (mock-backed; updated in place by save/submit). */
export function useRfqs() {
  return useQuery({ queryKey: rfqKeys.list(), queryFn: () => rfqApi.listRfqs() })
}
