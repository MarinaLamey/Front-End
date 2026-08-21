import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'

interface ExtendWindowDialogProps {
  open: boolean
  reference: string
  /** Current closing date (ISO) — shown as the "from" in the summary. */
  currentClosing: string
  /**
   * The RFQ's required delivery date (ISO). Closing must stay on or before it, so the picker is
   * capped here — extending past delivery would leave a window that can never be honoured.
   */
  deliveryDate?: string
  onClose: () => void
  onConfirm: (newClosingIso: string) => void
  loading?: boolean
}

/**
 * Extend the bidding window. Available while the RFQ is Live or Negotiating (source of truth v2.3,
 * 12 Aug 2026, change 6): it changes only the closing date, resets no bids, notifies nobody as an
 * amend and creates no new RFQ.
 *
 * The date moves FORWARD only and never past the delivery date. Forward-only matters beyond
 * tidiness: close-early was removed from the product, so a backward extend would be a way to end an
 * RFQ early through the side door.
 */
export function ExtendWindowDialog({
  open,
  reference,
  currentClosing,
  deliveryDate,
  onClose,
  onConfirm,
  loading,
}: ExtendWindowDialogProps) {
  const { t, i18n } = useTranslation()

  const toInput = (iso: string, plusDays = 0) => {
    const base = iso ? new Date(iso) : new Date()
    const d = new Date(base.getTime() + plusDays * 86_400_000)
    return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10)
  }
  const [newDate, setNewDate] = useState(() => toInput(currentClosing, 7))

  const dateFull = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'

  const current = currentClosing ? new Date(currentClosing) : null
  const delivery = deliveryDate ? new Date(deliveryDate) : null
  const picked = newDate ? new Date(`${newDate}T00:00:00`) : null
  const tooLate = picked !== null && delivery !== null && picked.getTime() > delivery.getTime()
  const valid = picked !== null && (!current || picked.getTime() > current.getTime()) && !tooLate

  const bullets = [
    t('rfq.detail.extend.b1', { from: dateFull(currentClosing), to: newDate ? dateFull(`${newDate}T00:00:00`) : '—' }),
    t('rfq.detail.extend.b2'),
    t('rfq.detail.extend.b3'),
    t('rfq.detail.extend.b4'),
  ]

  return (
    <Modal open={open} onClose={onClose} labelledBy="extend-title">
      <div className="flex items-start justify-between gap-3">
        <h2 id="extend-title" className="text-lg font-bold text-content-primary">
          {t('rfq.detail.extend.title')}
        </h2>
        <span className="shrink-0 rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-semibold text-brand-strong">{reference}</span>
      </div>
      <p className="mt-2 text-sm text-content-secondary">{t('rfq.detail.extend.body')}</p>

      <label className="mt-4 block text-sm font-medium text-content-secondary">{t('rfq.detail.extend.newDate')}</label>
      <input
        type="date"
        value={newDate}
        min={toInput(currentClosing, 1)}
        max={deliveryDate ? toInput(deliveryDate) : undefined}
        onChange={(e) => setNewDate(e.target.value)}
        className="mt-1.5 w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2.5 text-sm text-content-primary outline-none transition-colors focus:border-brand-primary"
      />
      {tooLate && (
        <p className="mt-1.5 text-xs font-medium text-status-danger">
          {t('rfq.detail.extend.pastDelivery', { date: dateFull(deliveryDate ?? '') })}
        </p>
      )}

      <div className="mt-4 rounded-xl bg-status-info-subtle p-4">
        <p className="text-sm font-semibold text-status-info">{t('rfq.detail.extend.whatHappens')}</p>
        <ul className="mt-2 space-y-2">
          {bullets.map((text) => (
            <li key={text} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-info" />
              <span className="text-sm text-content-secondary">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Stacks below `sm`: Button labels are `whitespace-nowrap overflow-hidden` with no ellipsis,
          so two `fullWidth` buttons squeezed side by side on a narrow modal would silently clip. */}
      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        <Button fullWidth isLoading={loading} disabled={!valid} onClick={() => picked && onConfirm(picked.toISOString())}>
          {t('rfq.detail.extend.confirm')}
        </Button>
        <Button variant="outline" fullWidth onClick={onClose}>
          {t('rfq.detail.extend.keep')}
        </Button>
      </div>
    </Modal>
  )
}
