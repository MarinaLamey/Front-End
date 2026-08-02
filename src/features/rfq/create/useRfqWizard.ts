import { useCurrentOrgMeta, useOrgVerification } from '@/features/verification'
import { useSaveRfqDraft, useSubmitRfq } from '../hooks/rfqQueries'
import { useRfqDraftStore } from './rfqDraftStore'
import { buildResult, computeOutcome } from './outcome'
import { stepValid } from './validation'

/**
 * useRfqWizard — the Create-RFQ orchestrator the page binds to. Composes the persisted draft
 * store with step validity, the verification gate (publish vs verify-to-publish) and the
 * save/submit mutations, exposing a flat surface the page and steps read from.
 */
export function useRfqWizard() {
  const store = useRfqDraftStore()

  const orgMeta = useCurrentOrgMeta()
  const { data: verification, isLoading: verificationLoading } = useOrgVerification(orgMeta)
  const verified = verification?.status === 'verified'
  // TODO(rbac): an org admin / approver may publish without sign-off → the `published` outcome.
  const canPublishDirectly = false

  const save = useSaveRfqDraft()
  const submit = useSubmitRfq()

  const canContinue = stepValid(store.step, store.draft)
  const isLastStep = store.step === 4

  const goNext = () => {
    if (canContinue && !isLastStep) store.next()
  }

  const saveDraft = () => {
    save.mutate(store.draft, {
      onSuccess: () => store.setResult(buildResult(store.draft, 'draft_saved')),
    })
  }

  const submitRfq = () => {
    const outcome = computeOutcome('submit', { verified, canPublishDirectly })
    submit.mutate(
      { draft: store.draft, outcome },
      { onSuccess: () => store.setResult(buildResult(store.draft, outcome)) },
    )
  }

  return {
    ...store,
    verified,
    verificationLoading,
    canContinue,
    isLastStep,
    goNext,
    goBack: store.back,
    saveDraft,
    submitRfq,
    isSaving: save.isPending,
    isSubmitting: submit.isPending,
  }
}
