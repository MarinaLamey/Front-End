import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
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

/** The dialogs on this screen all carry the same dismiss affordance. */
export function CloseButton({ onClose, label }: { onClose: () => void; label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClose}
      className="mp-press flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-content-tertiary transition-colors hover:bg-bg-surface-sunken hover:text-content-primary"
    >
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.667} className="h-4 w-4">
        <path d="m5 5 10 10M15 5 5 15" strokeLinecap="round" />
      </svg>
    </button>
  )
}
