import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { StatusBadge } from '@/shared/ui/dashboard'
import { cn } from '@/shared/lib/cn'
import { useOrganisation } from './useOrganisation'
import {
  useDisableMember,
  useInviteMember,
  useRemoveMember,
  useResendInvite,
  useRestoreMember,
  useSetMemberRole,
} from './hooks/orgQueries'
import { InviteUserDialog } from './components/InviteUserDialog'
import { ManageUserDialog } from './components/ManageUserDialog'
import { NoSeatsDialog } from './components/NoSeatsDialog'
import { ROLE_ORDER, type RoleKey } from './components/roles'
import { roleKeyOf } from './components/InviteUserDialog'
import type { OrgMember } from './types'

const ROLE_TONE: Record<OrgMember['role'], 'brand' | 'info' | 'success' | 'warning'> = {
  'Org Admin': 'brand',
  Buyer: 'info',
  Supplier: 'success',
  Both: 'warning',
}
const STATUS_TONE: Record<OrgMember['status'], 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  invited: 'warning',
  disabled: 'neutral',
}
/** The per-status row action: Active → Manage, Invited → Resend, Disabled → Restore. */
const STATUS_ACTION: Record<OrgMember['status'], string> = {
  active: 'org.users.manage',
  invited: 'org.users.resend',
  disabled: 'org.users.restore',
}

const GRID = 'grid grid-cols-[2.2fr_1fr_1fr_1.2fr_92px] items-center gap-3'

/**
 * OrganisationUsersPage — the Org-Admin's team roster: seat usage, a "what each role can do"
 * reference, and the members table with a per-status action.
 *
 * Seats are the constraint that shapes this screen. An invite consumes one the moment it is sent
 * and a disabled member frees theirs, so Invite opens the no-seats dialog rather than the form
 * when the org is full — the limit is enforced in the API too, not just here.
 */
export function OrganisationUsersPage() {
  const { t, i18n } = useTranslation()
  const { data, isLoading } = useOrganisation()
  const invite = useInviteMember()
  const setRole = useSetMemberRole()
  const disable = useDisableMember()
  const restore = useRestoreMember()
  const remove = useRemoveMember()
  const resend = useResendInvite()

  const [inviteOpen, setInviteOpen] = useState(false)
  const [noSeatsOpen, setNoSeatsOpen] = useState(false)
  const [managing, setManaging] = useState<OrgMember | null>(null)

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  const { seats } = data
  const pct = seats.total ? Math.round((seats.used / seats.total) * 100) : 0
  const full = seats.left <= 0

  const dateFull = (isoDate?: string) =>
    isoDate
      ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(
          new Date(isoDate),
        )
      : '—'

  /** Invite is one button with two destinations: the form, or the wall explaining why not. */
  const openInvite = () => (full ? setNoSeatsOpen(true) : setInviteOpen(true))

  const rowAction = (member: OrgMember) => {
    if (member.status === 'active') return setManaging(member)
    if (member.status === 'invited') return resend.mutate(member.id)
    // Restoring takes a seat back, so a full org gets the same wall as an invite.
    return full ? setNoSeatsOpen(true) : restore.mutate(member.id)
  }

  const closeManage = () => setManaging(null)

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 motion-safe:animate-card-in">
      {/* Header. */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-content-primary">{t('org.users.title')}</h1>
          <p className="mt-1 text-sm text-content-secondary">{t('org.users.subtitle', { org: data.identity.name })}</p>
        </div>
        <Button onClick={openInvite}>{t('org.users.inviteUser')}</Button>
      </div>

      {/* Seats bar. */}
      <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold text-content-primary">
            {t('org.users.seatsUsed', { used: seats.used, total: seats.total })}
          </span>
          <span className="rounded-full bg-status-warning-subtle px-2 py-0.5 text-xs font-semibold text-status-warning-strong">
            {t('org.users.seatsLeft', { count: seats.left })}
          </span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-bg-surface-sunken">
          <div
            className="h-full rounded-full bg-brand-primary transition-[width] duration-300 ease-out motion-reduce:transition-none"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-xs text-content-tertiary">{t('org.users.seatsNote', { count: seats.total })}</p>
      </div>

      {/* What each role can do. */}
      <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-sm font-semibold text-content-primary">{t('org.users.rolesTitle')}</h2>
          <span className="text-xs text-content-tertiary">{t('org.users.rolesFixed')}</span>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ROLE_ORDER.map((key) => (
            <div key={key} className="rounded-xl bg-bg-surface-sunken p-4">
              <StatusBadge
                label={t(`org.users.roles.${key}.name`)}
                tone={ROLE_TONE[roleOf(key)]}
                dot={false}
              />
              <p className="mt-2 text-xs text-content-tertiary">{t(`org.users.roles.${key}.desc`)}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-content-tertiary">{t('org.users.rolesNote')}</p>
      </div>

      {/* Members table. */}
      <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className={cn(GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
              <span>{t('org.users.col.user')}</span>
              <span>{t('org.users.col.role')}</span>
              <span>{t('org.users.col.status')}</span>
              <span>{t('org.users.col.lastActive')}</span>
              <span className="sr-only">{t('org.col.actions')}</span>
            </div>
            <ul className="divide-y divide-border-subtle">
              {data.members.map((m) => (
                <li key={m.id} className={cn(GRID, 'py-3')}>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium text-content-primary">{m.name}</span>
                    <span className="block truncate text-xs text-content-tertiary">{m.email}</span>
                  </span>
                  <span>
                    <StatusBadge
                      label={t(`org.users.roles.${roleKeyOf(m.role)}.name`)}
                      tone={ROLE_TONE[m.role]}
                      dot={false}
                    />
                  </span>
                  <span>
                    <StatusBadge label={t(`org.status.${m.status}`)} tone={STATUS_TONE[m.status]} dot={false} />
                  </span>
                  <span className="truncate text-sm text-content-secondary">{m.lastActive}</span>
                  <span className="justify-self-end">
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={
                        (resend.isPending && resend.variables === m.id) ||
                        (restore.isPending && restore.variables === m.id)
                      }
                      onClick={() => rowAction(m)}
                    >
                      {t(STATUS_ACTION[m.status])}
                    </Button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <p className="mt-4 text-xs text-content-tertiary">{t('org.users.footerNote')}</p>
      </div>

      <InviteUserDialog
        open={inviteOpen}
        orgName={data.identity.name}
        seatsLeft={seats.left}
        seatsTotal={seats.total}
        onClose={() => setInviteOpen(false)}
        loading={invite.isPending}
        onSubmit={(input) => invite.mutate(input, { onSuccess: () => setInviteOpen(false) })}
      />

      <ManageUserDialog
        open={managing !== null}
        member={managing}
        activeSince={dateFull(managing?.activeSince)}
        onClose={closeManage}
        loading={setRole.isPending || disable.isPending || remove.isPending}
        onSaveRole={(memberId, role) => setRole.mutate({ memberId, role }, { onSuccess: closeManage })}
        onDisable={(memberId) => disable.mutate(memberId, { onSuccess: closeManage })}
        onRemove={(memberId) => remove.mutate(memberId, { onSuccess: closeManage })}
      />

      <NoSeatsDialog
        open={noSeatsOpen}
        orgName={data.identity.name}
        seatsTotal={seats.total}
        onClose={() => setNoSeatsOpen(false)}
      />
    </section>
  )
}

/** Role key → the role value, so the reference tiles can reuse {@link ROLE_TONE}. */
function roleOf(key: RoleKey): OrgMember['role'] {
  return key === 'orgAdmin' ? 'Org Admin' : key === 'buyer' ? 'Buyer' : key === 'supplier' ? 'Supplier' : 'Both'
}
