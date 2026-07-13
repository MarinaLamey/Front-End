import { QueryClient } from '@tanstack/react-query'

/**
 * Server-cache client. Per the Zero-Fetch Rule: mutations project state with
 * `setQueryData`; we do NOT `invalidateQueries`. Fresh truth arrives via the socket
 * or a deliberate manual cache projection — never an automatic post-mutation refetch,
 * which would flicker and re-fetch needlessly.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
})
