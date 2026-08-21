import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Textarea } from '@/shared/ui/Textarea'

interface MissingDoc {
  cert: string
  note: string
}

interface CompareOverrideDialogProps {
  open: boolean
  supplierLabel: string
  missing: MissingDoc[]
  onClose: () => void
  onConfirm: (reason: string) => void
  loading?: boolean
}

/** Shown when awarding a bid that's missing RFQ-required documents — reason + accountability required. */
export function CompareOverrideDialog({
  open,
  supplierLabel,
  missing,
  onClose,
  onConfirm,
  loading,
}: CompareOverrideDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [accepted, setAccepted] = useState(false)
  // The override is an accountability record — require a substantive reason (20–500 chars).
  const reasonLength = reason.trim().length
  const reasonValid = reasonLength >= 20 && reasonLength <= 500
  const canConfirm = reasonValid && accepted

  return (
    <Modal open={open} onClose={onClose} labelledBy="override-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="override-title" className="text-lg font-bold text-content-primary">
          {t('rfq.compare.override.title')}
        </h2>
        <span className="shrink-0 rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
          {supplierLabel}
        </span>
      </div>
      <p className="mt-2 text-sm text-content-secondary">{t('rfq.compare.override.body')}</p>

      <div className="mt-4 rounded-xl bg-status-danger-subtle p-4">
        <p className="text-sm font-semibold text-status-danger">{t('rfq.compare.override.missingHeading')}</p>
        <ul className="mt-2 space-y-2">
          {missing.map((doc) => (
            <li key={doc.cert} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger" />
              <span>
                <span className="block text-sm font-medium text-content-primary">{doc.cert}</span>
                <span className="block text-xs text-content-tertiary">{doc.note}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>

      <label className="mt-4 block text-sm font-medium text-content-secondary">
        {t('rfq.compare.override.reasonLabel')}
      </label>
      <Textarea
        rows={3}
        className="mt-1.5"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        maxLength={500}
        aria-invalid={reasonLength > 0 && !reasonValid}
        placeholder={t('rfq.compare.override.reasonPlaceholder')}
      />
      <div className="mt-1.5 flex items-center justify-between text-xs">
        <span className={reasonLength > 0 && reasonLength < 20 ? 'text-status-danger' : 'text-content-tertiary'}>
          {t('common.minChars', { min: 20 })}
        </span>
        <span className="tabular-nums text-content-tertiary">{reasonLength}/500</span>
      </div>

      <label className="mt-4 flex items-start gap-2.5 rounded-lg bg-bg-surface-sunken p-3 text-sm text-content-secondary">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer accent-brand-primary"
        />
        {t('rfq.compare.override.accept')}
      </label>

      {/* Stacks below `sm`: Button labels are `whitespace-nowrap overflow-hidden` with no ellipsis,
          so two `fullWidth` buttons squeezed side by side on a narrow modal would silently clip. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button variant="danger" fullWidth disabled={!canConfirm} isLoading={loading} onClick={() => onConfirm(reason.trim())}>
          {t('rfq.compare.override.confirm')}
        </Button>
        <Button variant="outline" fullWidth onClick={onClose}>
          {t('rfq.detail.dialogs.amend.cancel')}
        </Button>
      </div>
    </Modal>
  )
}
