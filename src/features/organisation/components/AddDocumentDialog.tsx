import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { CloseButton, Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { FileDrop } from '@/shared/ui/FileDrop'
import { UploadIcon } from '@/shared/ui/dashboard'

interface AddDocumentDialogProps {
  open: boolean
  /** Named in the body so it's clear which organisation the file lands on. */
  orgName: string
  onClose: () => void
  onSubmit: (type: string, fileName: string) => void
  loading?: boolean
}

/**
 * AddDocumentDialog — attaches a further compliance document to the organisation record. Both a
 * type and a file are required; the document lands as Pending until review, which the footnote
 * says so nobody expects it to count towards verification straight away.
 */
export function AddDocumentDialog({ open, orgName, onClose, onSubmit, loading }: AddDocumentDialogProps) {
  const { t } = useTranslation()
  const types = t('org.profile.docTypeOptions', { returnObjects: true }) as string[]
  const [type, setType] = useState('')
  const [file, setFile] = useState<File | null>(null)

  // Reopening starts clean — a half-filled form from a cancelled attempt would be misleading.
  useEffect(() => {
    if (!open) return
    setType('')
    setFile(null)
  }, [open])

  const valid = type !== '' && file !== null

  return (
    <Modal open={open} onClose={onClose} labelledBy="add-doc-title" className="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="add-doc-title" className="text-lg font-bold text-content-primary">
            {t('org.profile.addDoc.title')}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">{t('org.profile.addDoc.body', { org: orgName })}</p>
        </div>
        <CloseButton onClose={onClose} label={t('common.close')} />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-content-primary">
          {t('org.profile.addDoc.typeLabel')}
          <span className="ms-0.5 text-status-danger">*</span>
        </span>
        <Select
          value={type}
          onChange={setType}
          options={types}
          placeholder={types[0]}
          ariaLabel={t('org.profile.addDoc.typeLabel')}
        />
      </div>

      <div className="mt-4">
        <FileDrop
          required
          label={t('org.profile.addDoc.fileLabel')}
          prompt={t('org.profile.upload.prompt')}
          hint={t('org.profile.upload.hint')}
          accept="application/pdf,image/jpeg,image/png"
          icon={<UploadIcon className="h-5 w-5" />}
          fileName={file?.name}
          onFile={setFile}
          removeLabel={t('org.profile.upload.remove')}
        />
      </div>

      <p className="mt-3 text-sm text-content-secondary">{t('org.profile.addDoc.note')}</p>

      <div className="mt-5 flex justify-end">
        <Button disabled={!valid} isLoading={loading} onClick={() => file && onSubmit(type, file.name)}>
          {t('org.profile.addDoc.submit')}
        </Button>
      </div>
    </Modal>
  )
}

/** Re-exported so the sibling dialogs keep importing it from here; it now lives in shared/ui. */
export { CloseButton }
