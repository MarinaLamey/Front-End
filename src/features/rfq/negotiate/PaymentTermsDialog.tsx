import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { PaymentTermsEditor } from '../create/components/PaymentTermsEditor'
import { CloseIcon } from '../create/components/icons'
import {
  presetMilestones,
  validatePayment,
  type Milestone,
  type PaymentPreset,
} from '../create/paymentRules'

interface PaymentTermsDialogProps {
  open: boolean
  /** The offer's VAT-inclusive total — every `= SAR` amount is a share of this. */
  total: number
  preset: PaymentPreset
  milestones: Milestone[]
  onClose: () => void
  onApply: (preset: PaymentPreset, milestones: Milestone[]) => void
  /**
   * Whose schedule is being edited. Both sides get the same editor; only the wording differs —
   * the buyer proposes a schedule to a supplier, the supplier counters the buyer's.
   */
  side?: 'buyer' | 'supplier'
}

/**
 * PaymentTermsDialog — the counter-offer's payment schedule, in the same editor the create wizard
 * uses so one schedule UI serves both. Edits live in a local draft: closing discards them, only
 * "Apply to counter" writes back, so an abandoned modal can't half-change the offer being built.
 */
export function PaymentTermsDialog({
  open,
  total,
  preset,
  milestones,
  onClose,
  onApply,
  side = 'buyer',
}: PaymentTermsDialogProps) {
  const { t } = useTranslation()
  const copy = side === 'supplier' ? 'rfq.supplier.nego.terms' : 'rfq.nego.terms'
  const [draftPreset, setDraftPreset] = useState(preset)
  const [draftMilestones, setDraftMilestones] = useState(milestones)

  // Re-seed each time the modal opens so it always reflects the counter as it stands now.
  useEffect(() => {
    if (!open) return
    setDraftPreset(preset)
    setDraftMilestones(milestones)
  }, [open, preset, milestones])

  // Picking a preset stamps its schedule; the editor only reports the choice, it doesn't rewrite rows.
  const choosePreset = (next: PaymentPreset) => {
    setDraftPreset(next)
    if (next !== 'custom') setDraftMilestones(presetMilestones(next))
  }


  return (
    <Modal open={open} onClose={onClose} labelledBy="nego-terms-title" className="max-w-3xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="nego-terms-title" className="text-lg font-bold text-content-primary">
            {t(`${copy}.title`)}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">{t(`${copy}.subtitle`)}</p>
        </div>
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="mp-press flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-content-tertiary transition-colors hover:bg-bg-surface-sunken hover:text-content-primary"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 max-h-[70vh] overflow-y-auto">
        <PaymentTermsEditor
          budget={total}
          preset={draftPreset}
          milestones={draftMilestones}
          onPresetChange={choosePreset}
          onMilestonesChange={setDraftMilestones}
          notice={t(`${copy}.proposing`)}
          // No footnote here: the two-to-five-milestone rule was removed, and the only rule left —
          // the percentages total 100% — is already stated by the Total row.
          footnote={null}
          showRules={false}
        />
      </div>

      <div className="mt-5 flex justify-end">
        <Button
          onClick={() => onApply(draftPreset, draftMilestones)}
          disabled={!validatePayment(draftMilestones).valid}
        >
          {t(`${copy}.apply`)}
        </Button>
      </div>
    </Modal>
  )
}
