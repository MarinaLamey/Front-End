import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { FileDrop } from '@/shared/ui/FileDrop'
import { UploadIcon } from '@/shared/ui/dashboard'
import { CloseButton } from './AddDocumentDialog'
import type { OrgDocument } from '../types'

interface ReuploadDocumentDialogProps {
  open: boolean
  /** The document being replaced — null while closed. */
  doc: OrgDocument | null
  onClose: () => void
  onSubmit: (docId: string, fileName: string) => void
  loading?: boolean
}

/**
 * ReuploadDocumentDialog — replaces an expiring document with its renewal. The current file stays
 * active until the new one is reviewed, so nothing lapses mid-review; the footnote states that
 * because it is the whole reason to renew early rather than delete and re-add.
 */
export function ReuploadDocumentDialog({ open, doc, onClose, onSubmit, loading }: ReuploadDocumentDialogProps) {
  const { t } = useTranslation()
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (open) setFile(null)
  }, [open])

  if (!doc) return null

  return (
    <Modal open={open} onClose={onClose} labelledBy="reupload-doc-title" className="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <h2 id="reupload-doc-title" className="text-lg font-bold text-content-primary">
          {t('org.profile.reupload.title', { type: doc.type })}
        </h2>
        <CloseButton onClose={onClose} label={t('common.close')} />
      </div>
      <p className="mt-1 text-sm text-content-secondary">
        {t('org.profile.reupload.body', { count: doc.expiresInDays ?? 0 })}
      </p>

      <div className="mt-4">
        <FileDrop
          required
          label={t('org.profile.reupload.fileLabel', { type: doc.type })}
          prompt={t('org.profile.upload.prompt')}
          hint={t('org.profile.upload.hint')}
          accept="application/pdf,image/jpeg,image/png"
          icon={<UploadIcon className="h-5 w-5" />}
          fileName={file?.name}
          onFile={setFile}
          removeLabel={t('org.profile.upload.remove')}
        />
      </div>

      <p className="mt-3 text-sm text-content-secondary">{t('org.profile.reupload.note')}</p>

      <div className="mt-5 flex justify-end">
        <Button disabled={!file} isLoading={loading} onClick={() => file && onSubmit(doc.id, file.name)}>
          {t('org.profile.reupload.submit')}
        </Button>
      </div>
    </Modal>
  )
}
