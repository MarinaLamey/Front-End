import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import type { OrgDocument } from '../types'

interface DeleteDocumentDialogProps {
  open: boolean
  doc: OrgDocument | null
  /** Formatted upload date, so the dialog names the exact file being destroyed. */
  uploadedOn: string
  /** Localised current status ("Expiring"), quoted back in the body line. */
  statusLabel: string
  onClose: () => void
  onConfirm: (docId: string) => void
  loading?: boolean
}

/**
 * DeleteDocumentDialog — confirms destroying a document. Deletion is not reversible and it leaves
 * the organisation showing as missing that document, so both consequences are spelled out before
 * the red action rather than discovered after it.
 */
export function DeleteDocumentDialog({
  open,
  doc,
  uploadedOn,
  statusLabel,
  onClose,
  onConfirm,
  loading,
}: DeleteDocumentDialogProps) {
  const { t } = useTranslation()
  if (!doc) return null

  const bullets = [
    t('org.profile.deleteDoc.bullets.removed'),
    t('org.profile.deleteDoc.bullets.missing'),
    t('org.profile.deleteDoc.bullets.permanent'),
  ]

  return (
    <Modal open={open} onClose={onClose} labelledBy="delete-doc-title" className="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <h2 id="delete-doc-title" className="text-lg font-bold text-content-primary">
          {t('org.profile.deleteDoc.title')}
        </h2>
        <span className="shrink-0 rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
          {doc.type}
        </span>
      </div>
      <p className="mt-2 text-sm text-content-secondary">
        {t('org.profile.deleteDoc.body', { file: doc.fileName, date: uploadedOn, status: statusLabel })}
      </p>

      <div className="mt-4 rounded-xl bg-status-danger-subtle p-4">
        <p className="text-sm font-semibold text-status-danger">{t('org.profile.deleteDoc.whatHappens')}</p>
        <ul className="mt-2 space-y-2">
          {bullets.map((text) => (
            <li key={text} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-status-danger" />
              <span className="text-sm text-content-secondary">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex gap-3">
        <Button variant="danger" fullWidth isLoading={loading} onClick={() => onConfirm(doc.id)}>
          {t('org.profile.deleteDoc.confirm')}
        </Button>
        <Button variant="outline" fullWidth onClick={onClose}>
          {t('org.profile.deleteDoc.keep')}
        </Button>
      </div>
    </Modal>
  )
}
