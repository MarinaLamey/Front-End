import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { CloseButton } from './AddDocumentDialog'

interface NoSeatsDialogProps {
  open: boolean
  orgName: string
  seatsTotal: number
  onClose: () => void
}

/**
 * NoSeatsDialog — shown instead of the invite form when every seat is taken. It names the two ways
 * out (free a seat, or raise the limit) and carries support's real contact details, because the
 * limit is not something an Org Admin can lift themselves.
 */
export function NoSeatsDialog({ open, orgName, seatsTotal, onClose }: NoSeatsDialogProps) {
  const { t } = useTranslation()

  const contacts = [
    { label: t('org.users.noSeats.email'), value: t('org.users.noSeats.emailValue') },
    { label: t('org.users.noSeats.phone'), value: t('org.users.noSeats.phoneValue') },
    { label: t('org.users.noSeats.hours'), value: t('org.users.noSeats.hoursValue') },
  ]

  return (
    <Modal open={open} onClose={onClose} labelledBy="no-seats-title" className="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <h2 id="no-seats-title" className="text-lg font-bold text-content-primary">
          {t('org.users.noSeats.title')}
        </h2>
        <CloseButton onClose={onClose} label={t('common.close')} />
      </div>

      <p className="mt-3 text-sm text-content-secondary">
        {t('org.users.noSeats.body', { org: orgName, count: seatsTotal })}
      </p>
      <p className="mt-3 text-sm text-content-secondary">{t('org.users.noSeats.freeSeat')}</p>

      <p className="mt-3 text-sm text-content-secondary">
        {t('org.users.noSeats.raiseLimit', { count: seatsTotal })}
      </p>
      <dl className="mt-1 text-sm text-content-secondary">
        {contacts.map((c) => (
          <div key={c.label} className="flex flex-wrap gap-x-3">
            <dt className="text-content-tertiary">{c.label}</dt>
            <dd className="text-content-secondary">{c.value}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5 flex justify-end">
        <Button onClick={onClose}>{t('org.users.noSeats.contact')}</Button>
      </div>
    </Modal>
  )
}
