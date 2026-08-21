import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'

interface EndNegotiationDialogProps {
  open: boolean
  supplierLabel: string
  roundLabel: string
  /** Formatted on-the-table offer, e.g. "SAR 101,200". */
  offerVersion: number
  offerAmount: string
  /** Formatted list of the other suppliers being negotiated, e.g. "Supplier B and Supplier C". */
  others: string
  onClose: () => void
  onConfirm: () => void
  loading?: boolean
}

/** Confirms closing a negotiation — it does NOT reject the bid; the offer stays awardable. */
export function EndNegotiationDialog({
  open,
  supplierLabel,
  roundLabel,
  offerVersion,
  offerAmount,
  others,
  onClose,
  onConfirm,
  loading,
}: EndNegotiationDialogProps) {
  const { t } = useTranslation()

  const bullets = [
    t('rfq.nego.end.bullets.stays', { version: offerVersion, amount: offerAmount }),
    t('rfq.nego.end.bullets.told', { supplier: supplierLabel }),
    others
      ? t('rfq.nego.end.bullets.others', { others })
      : t('rfq.nego.end.bullets.othersNone'),
    t('rfq.nego.end.bullets.reopen'),
  ]

  return (
    <Modal open={open} onClose={onClose} labelledBy="end-nego-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="end-nego-title" className="text-lg font-bold text-content-primary">
          {t('rfq.nego.end.title', { supplier: supplierLabel })}
        </h2>
        <span className="shrink-0 rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
          {roundLabel}
        </span>
      </div>
      <p className="mt-2 text-sm text-content-secondary">{t('rfq.nego.end.body')}</p>

      <div className="mt-4 rounded-xl bg-status-danger-subtle p-4">
        <p className="text-sm font-semibold text-status-danger">{t('rfq.nego.end.whatHappens')}</p>
        <ul className="mt-2 space-y-2">
          {bullets.map((text) => (
            <li key={text} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger" />
              <span className="text-sm text-content-secondary">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Stacks below `sm`: Button labels are `whitespace-nowrap overflow-hidden` with no ellipsis,
          so two `fullWidth` buttons squeezed side by side on a narrow modal would silently clip. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button variant="danger" fullWidth isLoading={loading} onClick={onConfirm}>
          {t('rfq.nego.end.confirm')}
        </Button>
        <Button variant="outline" fullWidth onClick={onClose}>
          {t('rfq.nego.end.keep')}
        </Button>
      </div>
    </Modal>
  )
}
