import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { createBlankDraft } from '../services/rfqApi'
import type { RfqDraft, RfqResult } from '../types'
import { presetMilestones, type Milestone, type PaymentPreset } from './paymentRules'

/** The four wizard steps: Requirement → Delivery & terms → Suppliers → Review. */
export type RfqStep = 1 | 2 | 3 | 4

interface RfqDraftState {
  step: RfqStep
  draft: RfqDraft
  /** Set once the wizard reaches a terminal outcome; drives the result card. */
  result: RfqResult | null
  /** True after the persisted draft has rehydrated — the page waits on this. */
  hasHydrated: boolean

  setStep: (step: RfqStep) => void
  next: () => void
  back: () => void
  patch: (partial: Partial<RfqDraft>) => void
  /** Choose a payment template — presets replace the rows; Custom keeps them to edit. */
  setPreset: (preset: PaymentPreset) => void
  setMilestones: (milestones: Milestone[]) => void
  setResult: (result: RfqResult | null) => void
  /** Load an existing RFQ into the wizard (Amend) — opens at step 1 as an editable draft. */
  loadDraft: (draft: RfqDraft) => void
  /** Discard everything and start a brand-new draft (new id + reference). */
  reset: () => void
  setHasHydrated: (value: boolean) => void
}

const clampStep = (value: number): RfqStep => Math.min(4, Math.max(1, value)) as RfqStep

export const useRfqDraftStore = create<RfqDraftState>()(
  persist(
    (set) => ({
      step: 1,
      draft: createBlankDraft(),
      result: null,
      hasHydrated: false,

      setStep: (step) => set({ step: clampStep(step) }),
      next: () => set((state) => ({ step: clampStep(state.step + 1) })),
      back: () => set((state) => ({ step: clampStep(state.step - 1) })),

      patch: (partial) => set((state) => ({ draft: { ...state.draft, ...partial } })),

      setPreset: (preset) =>
        set((state) => ({
          draft: {
            ...state.draft,
            paymentPreset: preset,
            // Presets stamp their rows in; Custom edits whatever rows are already present.
            milestones: preset === 'custom' ? state.draft.milestones : presetMilestones(preset),
          },
        })),

      setMilestones: (milestones) =>
        set((state) => ({ draft: { ...state.draft, milestones } })),

      setResult: (result) => set({ result }),

      loadDraft: (draft) => set({ step: 1, draft: { ...draft, status: 'draft' }, result: null }),

      reset: () => set({ step: 1, draft: createBlankDraft(), result: null }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'miproc.rfq.draft.v2',
      storage: createJSONStorage(() => localStorage),
      // Persist the in-progress draft + step so a returning buyer resumes; the result is transient.
      partialize: (state) => ({ step: state.step, draft: state.draft }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)


