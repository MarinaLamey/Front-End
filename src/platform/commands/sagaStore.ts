import { create } from 'zustand'

/** Status of an in-flight business transaction — `pending` is first-class, not an error. */
export type SagaStatus = 'pending' | 'confirmed' | 'failed'

export interface SagaEntry {
  correlationId: string
  label: string
  status: SagaStatus
  startedAt: number
  error?: string
}

interface SagaState {
  entries: Record<string, SagaEntry>
  track: (correlationId: string, label: string) => void
  resolve: (correlationId: string, status: 'confirmed' | 'failed', error?: string) => void
  clear: (correlationId: string) => void
}

/**
 * The saga tracker — one of the three stores (server-cache ‖ UI ‖ saga). It outlives
 * any single component, so an event arriving after a route change still resolves the
 * transaction that started it.
 */
export const useSagaStore = create<SagaState>((set) => ({
  entries: {},
  track: (correlationId, label) =>
    set((state) => ({
      entries: {
        ...state.entries,
        [correlationId]: { correlationId, label, status: 'pending', startedAt: Date.now() },
      },
    })),
  resolve: (correlationId, status, error) =>
    set((state) => {
      const entry = state.entries[correlationId]
      if (!entry) return state
      return { entries: { ...state.entries, [correlationId]: { ...entry, status, error } } }
    }),
  clear: (correlationId) =>
    set((state) => {
      if (!state.entries[correlationId]) return state
      const next = { ...state.entries }
      delete next[correlationId]
      return { entries: next }
    }),
}))
