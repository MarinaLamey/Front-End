import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'

/**
 * Confirms that a document is now part of the shipment record. Worth a modal rather than a toast:
 * the file becomes visible on the buyer's order, so the supplier should see plainly what they just
 * published and get the chance to swap it.
 */
export function CertificateAttachedModal({
  open,
  fileName,
  sizeKb = 240,
  onClose,
  onReplace,
}: {
  open: boolean
  fileName: string
  sizeKb?: number
  onClose: () => void
  onReplace: () => void
}) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} labelledBy="certificate-attached-title">
      <h2 id="certificate-attached-title" className="text-lg font-bold text-content-primary">
        {t('order.supplierView.certificate.title')}
      </h2>
      <p className="mt-2 text-sm text-content-secondary">{t('order.supplierView.certificate.body')}</p>

      <div className="mt-4 rounded-xl bg-status-success-subtle px-4 py-3">
        <p className="text-sm font-semibold text-status-success-strong">{fileName}</p>
        <p className="mt-0.5 text-xs text-content-secondary">
          {t('order.supplierView.certificate.uploaded', { size: sizeKb })}
        </p>
      </div>

      <div className="mt-5 flex gap-3">
        <Button fullWidth onClick={onClose}>
          {t('order.supplierView.certificate.done')}
        </Button>
        <Button variant="outline" fullWidth onClick={onReplace}>
          {t('order.supplierView.certificate.replace')}
        </Button>
      </div>
    </Modal>
  )
}
