import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Select } from '@/shared/ui/Select'
import { CloseButton } from './AddDocumentDialog'
import { ASSIGNABLE_ROLES, roleFromLabel } from './roles'
import { roleKeyOf } from './InviteUserDialog'
import type { OrgMember, OrgMemberRole } from '../types'

interface ManageUserDialogProps {
  open: boolean
  member: OrgMember | null
  /** Formatted active-since date for the identity line. */
  activeSince: string
  onClose: () => void
  onSaveRole: (memberId: string, role: OrgMemberRole) => void
  onDisable: (memberId: string) => void
  onRemove: (memberId: string) => void
  loading?: boolean
}

/**
 * ManageUserDialog — changes a member's role, or takes their access away. Disable and Remove are
 * plain links rather than buttons: they are the destructive exits from a dialog whose main job is
 * the role change, and the box above spells out how the two differ (seat freed vs access deleted).
 */
export function ManageUserDialog({
  open,
  member,
  activeSince,
  onClose,
  onSaveRole,
  onDisable,
  onRemove,
  loading,
}: ManageUserDialogProps) {
  const { t } = useTranslation()
  const [role, setRole] = useState<OrgMemberRole>('Buyer')

  useEffect(() => {
    if (open && member) setRole(member.role)
  }, [open, member])

  if (!member) return null

  // An Org Admin cannot be re-assigned that role, but their own row must still show it — so their
  // current role leads the list and the three assignable ones follow.
  const currentKey = roleKeyOf(member.role)
  const roleKeys = ASSIGNABLE_ROLES.includes(currentKey) ? ASSIGNABLE_ROLES : [currentKey, ...ASSIGNABLE_ROLES]
  const roleLabels = roleKeys.map((key) => t(`org.users.roles.${key}.name`))

  return (
    <Modal open={open} onClose={onClose} labelledBy="manage-user-title" className="max-w-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="manage-user-title" className="text-lg font-bold text-content-primary">
            {t('org.users.manageUser.title', { name: member.name })}
          </h2>
          <p className="mt-1 text-sm text-content-secondary">
            {t('org.users.manageUser.identity', {
              email: member.email,
              role: t(`org.users.roles.${roleKeyOf(member.role)}.name`),
              date: activeSince,
            })}
          </p>
        </div>
        <CloseButton onClose={onClose} label={t('common.close')} />
      </div>

      <div className="mt-4 flex flex-col gap-1.5">
        <span className="text-sm font-medium text-content-primary">
          {t('org.users.manageUser.roleLabel')}
          <span className="ms-0.5 text-status-danger">*</span>
        </span>
        <Select
          value={t(`org.users.roles.${roleKeyOf(role)}.name`)}
          onChange={(label) => setRole(roleFromLabel(label, t))}
          options={roleLabels}
          ariaLabel={t('org.users.manageUser.roleLabel')}
        />
      </div>
      <p className="mt-2 text-sm text-content-secondary">{t('org.users.rolesNote')}</p>

      <div className="mt-4 rounded-xl bg-bg-surface-sunken p-4">
        <p className="text-sm font-semibold text-content-primary">{t('org.users.manageUser.whatTheseDo')}</p>
        <ul className="mt-2 space-y-2">
          {[t('org.users.manageUser.bullets.disable'), t('org.users.manageUser.bullets.remove')].map((text) => (
            <li key={text} className="flex items-start gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-content-tertiary" />
              <span className="text-sm text-content-secondary">{text}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => onDisable(member.id)}
            disabled={member.status === 'disabled'}
            className="mp-press cursor-pointer text-sm font-medium text-content-link underline hover:text-content-link-hover disabled:cursor-not-allowed disabled:text-content-disabled disabled:no-underline"
          >
            {t('org.users.manageUser.disable')}
          </button>
          <button
            type="button"
            onClick={() => onRemove(member.id)}
            className="mp-press cursor-pointer text-sm font-medium text-content-link hover:text-content-link-hover"
          >
            {t('org.users.manageUser.remove')}
          </button>
        </div>
        <Button isLoading={loading} disabled={role === member.role} onClick={() => onSaveRole(member.id, role)}>
          {t('org.users.manageUser.save')}
        </Button>
      </div>
    </Modal>
  )
}
