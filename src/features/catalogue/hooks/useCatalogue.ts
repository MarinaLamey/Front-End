import { useQuery } from '@tanstack/react-query'
import { fetchCatalogue } from '../services/catalogueService'

export function useCatalogue() {
  return useQuery({ queryKey: ['catalogue'], queryFn: fetchCatalogue })
}
