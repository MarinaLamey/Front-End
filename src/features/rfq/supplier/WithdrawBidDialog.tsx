import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Textarea } from '@/shared/ui/Textarea'
import { cn } from '@/shared/lib/cn'

const MIN_REASON = 20
const MAX_REASON = 500

interface WithdrawBidDialogProps {
  open: boolean
  /** The RFQ being left, shown as a pill beside the title so the dialog names what it acts on. */
  reference: string
  onClose: () => void
  onConfirm: (reason: string) => void
  loading?: boolean
}

/**
 * Confirms pulling a bid out of an RFQ. Withdrawing removes the bid from the buyer's comparison and
 * the reason is shared with the buyer in full, so it is required and bounded at 20–500 characters
 * with a live counter (Negotiation & Orders SoT §5, §12).
 *
 * It does NOT lock the supplier out: while the request is still live they may simply bid again, and
 * there is no reliability record in this phase. Both of those claims were on this dialog and both
 * were false — they made the exit read as more final and more punitive than it is, which is a reason
 * a supplier would stay in an exercise they wanted to leave.
 */
export function WithdrawBidDialog({ open, reference, onClose, onConfirm, loading }: WithdrawBidDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')

  const trimmed = reason.trim()
  const valid = trimmed.length >= MIN_REASON && trimmed.length <= MAX_REASON

  const bullets = [
    t('rfq.supplier.withdraw.bullets.leaves'),
    t('rfq.supplier.withdraw.bullets.mayBidAgain'),
    t('rfq.supplier.withdraw.bullets.reasonShared'),
  ]

  return (
    <Modal open={open} onClose={onClose} labelledBy="withdraw-bid-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="withdraw-bid-title" className="text-lg font-bold text-content-primary">
          {t('rfq.supplier.withdraw.title')}
        </h2>
        <span className="shrink-0 rounded-full bg-status-info-subtle px-2 py-0.5 text-xs font-semibold text-status-info">
          {reference}
        </span>
      </div>
      <p className="mt-2 text-sm text-content-secondary">{t('rfq.supplier.withdraw.body')}</p>

      <div className="mt-4 rounded-xl bg-status-danger-subtle p-4">
        <p className="text-sm font-semibold text-status-danger">{t('rfq.supplier.withdraw.whatHappens')}</p>
        <ul className="mt-2 space-y-2">
          {bullets.map((text) => (
            <li key={text} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger" />
              <span className="text-sm text-content-secondary">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <label className="mt-4 block">
        <span className="mb-1 block text-xs font-medium text-content-secondary">
          {t('rfq.supplier.withdraw.reasonLabel')}
        </span>
        <Textarea
          rows={3}
          value={reason}
          maxLength={MAX_REASON}
          onChange={(e) => setReason(e.target.value)}
          placeholder={t('rfq.supplier.withdraw.reasonPlaceholder')}
        />
        {/* A LIVE counter, always on — the shared reason rule is 20–500 everywhere, and the supplier
            needs to see where they stand before the button explains itself by being disabled. */}
        <span className={cn('mt-1 block text-xs', valid ? 'text-content-tertiary' : 'text-status-warning-strong')}>
          {t('rfq.supplier.withdraw.reasonHint', { min: MIN_REASON, count: trimmed.length, max: MAX_REASON })}
        </span>
      </label>

      {/* Stacks below `sm`: Button labels are `whitespace-nowrap overflow-hidden` with no ellipsis,
          so two `fullWidth` buttons squeezed side by side on a narrow modal would silently clip. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button variant="danger" fullWidth disabled={!valid} isLoading={loading} onClick={() => onConfirm(trimmed)}>
          {t('rfq.supplier.withdraw.confirm')}
        </Button>
        <Button variant="outline" fullWidth onClick={onClose}>
          {t('rfq.supplier.withdraw.keep')}
        </Button>
      </div>
    </Modal>
  )
}
