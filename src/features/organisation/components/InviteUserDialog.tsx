import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { Field } from '@/shared/ui/Field'
import { isEmail } from '@/shared/lib/validators'
import { CloseButton } from './AddDocumentDialog'
import { ROLE_ORDER, roleFromLabel } from './roles'
import type { InviteInput, OrgMemberRole } from '../types'

interface InviteUserDialogProps {
  open: boolean
  orgName: string
  seatsLeft: number
  seatsTotal: number
  onClose: () => void
  onSubmit: (input: InviteInput) => void
  loading?: boolean
}

/**
 * InviteUserDialog — sends an email invitation that consumes a seat the moment it goes out, which
 * is why the remaining count is stated next to the button rather than left to be discovered.
 */
export function InviteUserDialog({
  open,
  orgName,
  seatsLeft,
  seatsTotal,
  onClose,
  onSubmit,
  loading,
}: InviteUserDialogProps) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<OrgMemberRole>('Buyer')

  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setRole('Buyer')
  }, [open])

  const roleLabels = ROLE_ORDER.map((key) => t(`org.users.roles.${key}.name`))
  const valid = name.trim().length > 1 && isEmail(email.trim())

  return (
    <Modal open={open} onClose={onClose} labelledBy="invite-user-title" className="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="invite-user-title" className="text-lg font-bold text-content-primary">
            {t('org.users.invite.title')}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">{t('org.users.invite.body', { org: orgName })}</p>
        </div>
        <CloseButton onClose={onClose} label={t('common.close')} />
      </div>

      <div className="mt-4 flex flex-col gap-4">
        <Field
          required
          label={t('org.users.invite.nameLabel')}
          placeholder={t('org.users.invite.namePlaceholder')}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <Field
          required
          type="email"
          label={t('org.users.invite.emailLabel')}
          placeholder={t('org.users.invite.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-content-primary">
            {t('org.users.invite.roleLabel')}
            <span className="ms-0.5 text-status-danger">*</span>
          </span>
          <Select
            value={t(`org.users.roles.${roleKeyOf(role)}.name`)}
            onChange={(label) => setRole(roleFromLabel(label, t))}
            options={roleLabels}
            ariaLabel={t('org.users.invite.roleLabel')}
          />
        </div>
      </div>

      <p className="mt-3 text-sm text-content-secondary">{t('org.users.invite.roleHint')}</p>
      <p className="mt-1 text-sm text-content-secondary">
        {t('org.users.invite.seatHint', { count: seatsLeft, total: seatsTotal })}
      </p>

      <div className="mt-5 flex justify-end">
        <Button
          disabled={!valid}
          isLoading={loading}
          onClick={() => onSubmit({ name: name.trim(), email: email.trim(), role })}
        >
          {t('org.users.invite.submit')}
        </Button>
      </div>
    </Modal>
  )
}

/** Role → its i18n leaf. Kept here because only the dialogs need to go that direction. */
function roleKeyOf(role: OrgMemberRole): (typeof ROLE_ORDER)[number] {
  return role === 'Org Admin' ? 'orgAdmin' : role === 'Buyer' ? 'buyer' : role === 'Supplier' ? 'supplier' : 'viewer'
}

export { roleKeyOf }
