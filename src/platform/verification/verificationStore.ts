import { create } from 'zustand'

/**
 * Org KYB verification status. Owned by the back-office (an admin manually reviews CR/VAT/
 * address) — the frontend only READS it. It is independent of any subscription/plan.
 */
export type VerificationStatus = 'pending' | 'verified' | 'rejected'

const ORDER: VerificationStatus[] = ['pending', 'verified', 'rejected']
const STORAGE_KEY = 'miproc.verification.demo'

function read(): VerificationStatus {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'pending' || raw === 'verified' || raw === 'rejected') return raw
  } catch {
    /* storage unavailable */
  }
  return 'verified'
}

function persist(status: VerificationStatus): void {
  try {
    localStorage.setItem(STORAGE_KEY, status)
  } catch {
    /* storage unavailable */
  }
}

interface VerificationState {
  status: VerificationStatus
  setStatus: (status: VerificationStatus) => void
  /**
   * DEMO ONLY. There is no admin backend yet, so this lets us preview all three states from the
   * status pill. Real integration replaces this store's source with the API read — consumers
   * (`useVerification`) don't change.
   */
  cycle: () => void
}

/**
 * useVerification — the KYB verification state, as a Zustand store (matching the project's
 * brandingStore pattern: no provider, selector-based reads). Seeded from and persisted to
 * localStorage for the demo; swap the source for the API when the org-status endpoint exists.
 */
export const useVerification = create<VerificationState>((set, get) => ({
  status: read(),
  setStatus: (status) => {
    persist(status)
    set({ status })
  },
  cycle: () => {
    const next = ORDER[(ORDER.indexOf(get().status) + 1) % ORDER.length]
    persist(next)
    set({ status: next })
  },
}))
