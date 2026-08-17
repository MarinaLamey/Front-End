import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { Field } from '@/shared/ui/Field'
import { isEmail, isStrongPassword } from '@/shared/lib/validators'
import { EyeIcon, EyeOffIcon } from '@/features/auth/components/authIcons'
import { CloseButton } from './AddDocumentDialog'
import { ASSIGNABLE_ROLES, roleFromLabel, type RoleKey } from './roles'
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
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [role, setRole] = useState<OrgMemberRole>('Buyer')

  useEffect(() => {
    if (!open) return
    setName('')
    setEmail('')
    setPassword('')
    // Re-mask on every open: a password left visible from a previous invite would be on screen
    // before the admin has typed anything.
    setShowPassword(false)
    setRole('Buyer')
  }, [open])

  const roleLabels = ASSIGNABLE_ROLES.map((key) => t(`org.users.roles.${key}.name`))
  const strongEnough = isStrongPassword(password)
  const valid = name.trim().length > 1 && isEmail(email.trim()) && strongEnough

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
        {/* The Org Admin sets the password: POST /api/admin/users creates the account outright and
            takes one, so there is no set-your-own-password step for the new user to complete. */}
        <Field
          required
          type={showPassword ? 'text' : 'password'}
          autoComplete="new-password"
          label={t('org.users.invite.passwordLabel')}
          placeholder="••••••••"
          helperText={t('auth.passwordRule')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={password.length > 0 && !strongEnough ? { title: t('auth.passwordRule') } : null}
          success={strongEnough}
          trailingAction={{
            icon: showPassword ? (
              <EyeOffIcon className="h-[18px] w-[18px]" />
            ) : (
              <EyeIcon className="h-[18px] w-[18px]" />
            ),
            label: t('auth.togglePassword'),
            onClick: () => setShowPassword((shown) => !shown),
            pressed: showPassword,
          }}
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
          onClick={() => onSubmit({ name: name.trim(), email: email.trim(), password, role })}
        >
          {t('org.users.invite.submit')}
        </Button>
      </div>
    </Modal>
  )
}

/** Role → its i18n leaf. Kept here because only the dialogs need to go that direction. */
const ROLE_KEYS: Record<OrgMemberRole, RoleKey> = {
  'Org Admin': 'orgAdmin',
  Buyer: 'buyer',
  Supplier: 'supplier',
  Both: 'both',
}

function roleKeyOf(role: OrgMemberRole): RoleKey {
  return ROLE_KEYS[role]
}

export { roleKeyOf }
