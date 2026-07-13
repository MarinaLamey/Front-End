import { useQuery } from '@tanstack/react-query'
import { fetchRfqs } from '../services/rfqService'

export function useRfqs() {
  return useQuery({ queryKey: ['rfqs'], queryFn: fetchRfqs })
}
