import type { CatalogueItem } from '../types'

const MOCK: CatalogueItem[] = [
  { id: 'c1', name: 'Portland Cement (50kg)', category: 'Cement', supplier: 'Supplier A', certified: true },
  { id: 'c2', name: 'Steel Rebar 12mm', category: 'Steel', supplier: 'Supplier B', certified: true },
  { id: 'c3', name: 'Ready-mix Concrete M30', category: 'Concrete', supplier: 'Supplier C', certified: false },
  { id: 'c4', name: 'Crushed Aggregate 20mm', category: 'Aggregate', supplier: 'Supplier A', certified: true },
]

/** Mock read model. Real impl: GET via the BFF with ETag/304 (catalogue is a priority cache target). */
export async function fetchCatalogue(): Promise<CatalogueItem[]> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return MOCK
}
