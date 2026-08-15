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
  /** True while amending an already-published RFQ — locks the fields suppliers were matched on
   * (category + regions) since they define the audience already invited. */
  amending: boolean
  /** True after the persisted draft has rehydrated — the page waits on this. */
  hasHydrated: boolean
  /**
   * When the draft was last written to storage (epoch ms). Every mutator stamps it, because the
   * persist middleware writes synchronously on each `set` — so this really is the save time, and
   * the wizard footer can state it rather than leaving the buyer guessing whether work is kept.
   */
  savedAt: number

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
  /**
   * Copy a resolved RFQ into a brand-new draft (Duplicate, offered on cancelled/expired RFQs).
   * Keeps the requirement and terms, drops the original's identity and history, and does NOT set
   * the amend lock — a duplicate has no invited audience to protect.
   */
  duplicateDraft: (source: RfqDraft) => void
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
      amending: false,
      hasHydrated: false,
      savedAt: Date.now(),

      setStep: (step) => set({ step: clampStep(step) }),
      next: () => set((state) => ({ step: clampStep(state.step + 1) })),
      back: () => set((state) => ({ step: clampStep(state.step - 1) })),

      patch: (partial) =>
        set((state) => ({ draft: { ...state.draft, ...partial }, savedAt: Date.now() })),

      setPreset: (preset) =>
        set((state) => ({
          savedAt: Date.now(),
          draft: {
            ...state.draft,
            paymentPreset: preset,
            // Presets stamp their rows in; Custom edits whatever rows are already present.
            milestones: preset === 'custom' ? state.draft.milestones : presetMilestones(preset),
          },
        })),

      setMilestones: (milestones) =>
        set((state) => ({ draft: { ...state.draft, milestones }, savedAt: Date.now() })),

      setResult: (result) => set({ result }),

      loadDraft: (draft) =>
        set({
          step: 1,
          draft: { ...draft, status: 'draft' },
          result: null,
          amending: true,
          savedAt: Date.now(),
        }),

      duplicateDraft: (source) => {
        const fresh = createBlankDraft()
        set({
          step: 1,
          result: null,
          amending: false,
          savedAt: Date.now(),
          draft: {
            ...source,
            id: fresh.id,
            reference: fresh.reference,
            status: 'draft',
            bids: 0,
            awards: undefined,
            negotiations: undefined,
            orderMessages: undefined,
            supplierBid: undefined,
            cancelReason: undefined,
            cancelledAt: undefined,
            createdAt: fresh.createdAt,
            updatedAt: fresh.updatedAt,
          },
        })
      },

      reset: () =>
        set({ step: 1, draft: createBlankDraft(), result: null, amending: false, savedAt: Date.now() }),

      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      name: 'miproc.rfq.draft.v3',
      storage: createJSONStorage(() => localStorage),
      // Persist the in-progress draft + step (and amend-lock) so a returning buyer resumes; the
      // result is transient.
      partialize: (state) => ({
        step: state.step,
        draft: state.draft,
        amending: state.amending,
        savedAt: state.savedAt,
      }),
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
)


