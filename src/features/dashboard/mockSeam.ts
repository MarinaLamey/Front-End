import type { DashboardSeam } from './types'

/** The part of a TanStack query the seam needs. Structural, so it fits any of them. */
interface QueryLike {
  isError: boolean
  isRefetching: boolean
  refetch: () => unknown
}

/**
 * Folds the queries behind the MOCK seam into the failure/retry half of {@link DashboardSeam}.
 *
 * The mock reads localStorage, so a failure here is a store or parse fault rather than a network
 * one — it maps to `server` and carries no status code, because there was no HTTP response to take
 * one from. It exists so the mock and real seams have the same shape and the dashboard pages can
 * stay identical in both repos, not because the mock is expected to fail.
 */
export function mockSeamState(queries: QueryLike[]): Pick<DashboardSeam, 'error' | 'refetch' | 'isRefetching'> {
  let failed = false
  let refetching = false
  for (const query of queries) {
    if (query.isError) failed = true
    if (query.isRefetching) refetching = true
  }
  return {
    error: failed ? { variant: 'server' } : undefined,
    refetch: () => {
      for (const query of queries) query.refetch()
    },
    isRefetching: refetching,
  }
}
