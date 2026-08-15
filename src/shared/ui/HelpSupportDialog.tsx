import { useTranslation } from 'react-i18next'
import { Modal } from './Modal'
import { CloseIcon } from './dashboard'

interface HelpSupportDialogProps {
  open: boolean
  onClose: () => void
}

/** One labelled contact detail. */
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-content-tertiary">{label}</span>
      <span className="text-sm text-content-primary">{value}</span>
    </div>
  )
}

/**
 * Help & support — the contact card the sidebar link opens. Static details for now; it becomes a
 * real support entry point (ticketing / live chat) when there is a backend for one.
 */
export function HelpSupportDialog({ open, onClose }: HelpSupportDialogProps) {
  const { t } = useTranslation()

  return (
    <Modal open={open} onClose={onClose} labelledBy="help-support-title" className="max-w-sm p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="help-support-title" className="text-base font-bold text-content-primary">
            {t('help.title')}
          </h2>
          <p className="mt-0.5 text-sm text-content-secondary">{t('help.subtitle')}</p>
        </div>
        <button
          type="button"
          aria-label={t('common.close')}
          onClick={onClose}
          className="-me-1 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-content-tertiary transition-colors hover:bg-interactive-hover hover:text-content-primary"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <Detail label={t('help.emailLabel')} value={t('help.email')} />
        <Detail label={t('help.phoneLabel')} value={t('help.phone')} />
        <Detail label={t('help.hoursLabel')} value={t('help.hours')} />
      </div>
    </Modal>
  )
}
