import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  SectionCard,
  StatusBadge,
  ListRow,
  QuickActionCard,
  BankIcon,
  UsersIcon,
  FileIcon,
  CoinsIcon,
  ChecklistIcon,
  ChatIcon,
  ShieldDocIcon,
  BarsIcon,
  PlusIcon,
  ChevronRightIcon,
  EditIcon,
  TrashIcon,
} from '@/shared/ui/dashboard'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { useCurrentOrgMeta, useOrgVerification, VERIFICATION_BADGE } from '@/features/verification'
import { useOrganisation } from './useOrganisation'
import type { OrgActionItem, OrgMember } from './types'

/** Role pill tone: Org Admin = brand, Buyer = info, Supplier = success, Both = warning. */
const ROLE_TONE: Record<OrgMember['role'], 'brand' | 'info' | 'success' | 'warning'> = {
  'Org Admin': 'brand',
  Buyer: 'info',
  Supplier: 'success',
  Both: 'warning',
}

/** Member-status pill tone: active = success, invited = warning, disabled = neutral. */
const STATUS_TONE: Record<OrgMember['status'], 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  invited: 'warning',
  disabled: 'neutral',
}

/**
 * The action feed's three kinds, each with its own icon, tint and destination. Declared as maps
 * rather than inline ternaries so a fourth kind cannot silently inherit another one's icon or,
 * worse, another one's route.
 */
const ACTION_ICON: Record<OrgActionItem['kind'], React.ReactNode> = {
  access: <ChecklistIcon />,
  renewal: <ChatIcon />,
  inactive: <UsersIcon />,
}

const ACTION_TONE: Record<OrgActionItem['kind'], 'brand' | 'success' | 'warning'> = {
  access: 'brand',
  renewal: 'success',
  inactive: 'warning',
}

/** Where each kind is resolved: seats and sign-ins on Users, a document renewal on the profile. */
const ACTION_ROUTE: Record<OrgActionItem['kind'], string> = {
  access: 'users',
  renewal: 'profile',
  inactive: 'users',
}

/**
 * OrganisationOverviewPage — the Org-Admin home: company identity, org-level action feed, headline
 * tiles (seats / bids / payment), bid summary + receivables, the user-administration table, and
 * quick actions. All data comes from the {@link useOrganisation} seam.
 */
export function OrganisationOverviewPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data, isLoading } = useOrganisation()
  // The organisation's verification state has ONE owner: the back-office decision on its
  // documents. Every screen reads it from here rather than storing or assuming a state.
  const { data: verification } = useOrgVerification(useCurrentOrgMeta())
  const orgBadge = VERIFICATION_BADGE[verification?.status ?? 'pending']

  if (isLoading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }

  return (
    <section className="mx-auto w-full max-w-6xl space-y-6 motion-safe:animate-card-in">
      {/* Company identity card. */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-surface p-5">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-subtle text-brand-primary">
            <BankIcon className="h-6 w-6" />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-lg font-bold tracking-tight text-content-primary">{data.identity.name}</h1>
              {/* The organisation's verification state — the back-office decision, not a local flag. */}
              <StatusBadge label={t(orgBadge.key)} tone={orgBadge.tone} />
              <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand-strong">
                {data.identity.type}
              </span>
            </div>
            <p className="mt-1 text-sm text-content-secondary">
              CR {data.identity.cr} · VAT {data.identity.vat} · {data.identity.location}
            </p>
          </div>
        </div>
        <Button variant="outline" leftIcon={<BankIcon className="h-4 w-4" />} onClick={() => navigate('profile')}>
          {t('org.manageOrg')}
        </Button>
      </div>

      {/* Action required today. */}
      <SectionCard
        title={
          <span className="flex items-center gap-2">
            {t('dashboard.actionRequired')}
            <span className="rounded-full bg-status-danger-subtle px-1.5 text-xs font-semibold text-status-danger">
              {data.actions.length}
            </span>
          </span>
        }
      >
        <p className="-mt-1 mb-2 text-sm text-content-tertiary">{t('org.itemsNeed', { count: data.actions.length })}</p>
        <ul className="flex flex-col divide-y divide-border-subtle">
          {data.actions.map((action) => (
            <li key={action.id} className="py-2 first:pt-0 last:pb-0">
              <ListRow
                icon={ACTION_ICON[action.kind]}
                iconTone={ACTION_TONE[action.kind]}
                title={action.text}
                trailing={
                  <Button
                    variant={action.primary ? 'primary' : 'outline'}
                    size="sm"
                    onClick={() => navigate(ACTION_ROUTE[action.kind])}
                  >
                    {action.actionLabel}
                  </Button>
                }
              />
            </li>
          ))}
        </ul>

        {/* Feed footer. The day pager has no behaviour behind it yet, so it renders as text rather
            than advertising a control that does nothing — same treatment as the buyer dashboard. */}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-3">
          <span className="inline-flex items-center gap-2 text-sm text-content-secondary">
            <ChevronRightIcon className="h-3.5 w-3.5 rotate-180 rtl:rotate-0 text-content-tertiary" />
            <span className="font-medium text-content-primary">{t('org.feed.today')}</span>
            <ChevronRightIcon className="h-3.5 w-3.5 rtl:rotate-180 text-content-tertiary" />
          </span>
          <span className="text-xs text-content-tertiary">{t('org.feed.swipeHint')}</span>
        </div>
      </SectionCard>

      {/* Headline tiles. */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Tile icon={<UsersIcon />} accent="brand" value={`${data.seats.used} / ${data.seats.total}`} label={t('org.tiles.users')} sub={t('org.tiles.usersSub', { active: data.seats.active, disabled: data.seats.disabled })} />
        <Tile icon={<FileIcon />} accent="teal" value={String(data.bids.total)} label={t('org.tiles.orgBids')} sub={t('org.tiles.bidsSub', { bidding: data.bids.bidding, negotiating: data.bids.negotiating })} />
        <Tile icon={<CoinsIcon />} accent="success" value={data.payment.receivedMtd} label={t('org.tiles.paymentReceived')} sub={t('org.tiles.paymentSub', { amount: data.payment.receivable })} />
      </div>

      {/* Bid summary + Receivables. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <SectionCard
          title={t('org.bidSummary')}
          action={<ViewAll onClick={() => navigate('/buyer/bids')} label={t('dashboard.viewAll')} />}
        >
          <ul className="flex flex-col gap-3">
            <Legend color="bg-status-info" label={t('org.pipeline.bidding')} value={data.bidSummary.bidding} />
            <Legend color="bg-status-warning" label={t('org.pipeline.negotiating')} value={data.bidSummary.negotiating} />
            <Legend color="bg-status-success" label={t('org.pipeline.won')} value={data.bidSummary.won} />
            <Legend color="bg-content-tertiary" label={t('org.pipeline.lost')} value={data.bidSummary.lost} />
          </ul>
        </SectionCard>

        <SectionCard title={t('org.receivables')} action={<ViewAll onClick={() => undefined} label={t('dashboard.viewAll')} />}>
          <ul className="flex flex-col gap-3">
            <Legend color="bg-status-success" label={t('org.money.received')} value={data.receivables.received} />
            <Legend color="bg-status-info" label={t('org.money.pending')} value={data.receivables.pending} />
            {/* Amber, not red: overdue is a nudge on this screen, not a failure state. */}
          <Legend color="bg-status-warning" label={t('org.money.overdue')} value={data.receivables.overdue} />
          </ul>
        </SectionCard>
      </div>

      {/* User administration. */}
      <SectionCard
        title={t('org.userAdmin')}
        action={
          <Button variant="primary" size="sm" leftIcon={<PlusIcon className="h-4 w-4" />} onClick={() => navigate('users')}>
            {t('org.addUser')}
          </Button>
        }
      >
        <p className="-mt-1 mb-3 text-sm text-content-tertiary">
          {t('org.seatsUsed', { used: data.seats.used, total: data.seats.total })}
        </p>
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[1.6fr_1.8fr_1fr_1fr_0.9fr_64px] gap-3 border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary">
              <span>{t('org.col.name')}</span>
              <span>{t('org.col.email')}</span>
              <span>{t('org.col.department')}</span>
              <span>{t('org.col.role')}</span>
              <span>{t('org.col.status')}</span>
              <span className="sr-only">{t('org.col.actions')}</span>
            </div>
            <ul className="divide-y divide-border-subtle">
              {data.members.map((m) => (
                <li key={m.id} className="grid grid-cols-[1.6fr_1.8fr_1fr_1fr_0.9fr_64px] items-center gap-3 py-3">
                  <span className="flex items-center gap-2 min-w-0">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-strong">
                      {m.name.split(' ').map((p) => p[0]).slice(0, 2).join('')}
                    </span>
                    <span className="truncate text-sm font-medium text-content-primary">{m.name}</span>
                  </span>
                  <span className="truncate text-sm text-content-secondary">{m.email}</span>
                  <span className="truncate text-sm text-content-secondary">{m.department}</span>
                  <span>
                    <StatusBadge label={m.role} tone={ROLE_TONE[m.role]} dot={false} />
                  </span>
                  <span>
                    <StatusBadge label={t(`org.status.${m.status}`)} tone={STATUS_TONE[m.status]} dot={false} />
                  </span>
                  <span className="flex items-center justify-end gap-2 text-content-tertiary">
                    <button type="button" aria-label={t('org.editUser')} onClick={() => navigate('users')} className="cursor-pointer hover:text-content-primary">
                      <EditIcon className="h-4 w-4" />
                    </button>
                    <button type="button" aria-label={t('org.deleteUser')} onClick={() => navigate('users')} className="cursor-pointer hover:text-status-danger">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </SectionCard>

      {/* Quick actions. */}
      <div>
        <h2 className="mb-4 text-base font-semibold text-content-primary">{t('dashboard.quickActions')}</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <QuickActionCard icon={<UsersIcon />} label={t('org.actions.addUser')} accent="brand" onClick={() => navigate('users')} />
          <QuickActionCard icon={<ShieldDocIcon />} label={t('org.actions.manageRoles')} accent="success" onClick={() => navigate('users')} />
          <QuickActionCard icon={<BankIcon />} label={t('org.actions.orgProfile')} accent="brand" onClick={() => navigate('profile')} />
          <QuickActionCard icon={<BarsIcon />} label={t('org.actions.reports')} accent="danger" onClick={() => undefined} />
        </div>
      </div>
    </section>
  )
}

/* ── Local presentational bits ────────────────────────────────────────────── */

/** Solid fills with a white glyph — the org tiles read as headline figures, not status chips. */
const TILE_ACCENT: Record<'brand' | 'teal' | 'success', string> = {
  brand: 'bg-brand-primary text-brand-primary-on',
  teal: 'bg-brand-secondary text-brand-secondary-on',
  success: 'bg-status-success text-white',
}

function Tile({ icon, accent, value, label, sub }: { icon: React.ReactNode; accent: 'brand' | 'teal' | 'success'; value: string; label: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border-subtle bg-bg-surface p-5">
      <span className={cn('flex h-10 w-10 items-center justify-center rounded-xl [&_svg]:h-5 [&_svg]:w-5', TILE_ACCENT[accent])}>{icon}</span>
      <p className="mt-3 text-2xl font-bold tracking-tight text-content-primary">{value}</p>
      <p className="text-sm text-content-secondary">{label}</p>
      <p className="mt-0.5 text-xs text-content-tertiary">{sub}</p>
    </div>
  )
}

function Legend({ color, label, value }: { color: string; label: string; value: string | number }) {
  return (
    <li className="flex items-center justify-between gap-3 text-sm">
      <span className="inline-flex items-center gap-2 text-content-secondary">
        <span className={cn('h-2 w-2 rounded-full', color)} />
        {label}
      </span>
      <span className="font-semibold text-content-primary">{value}</span>
    </li>
  )
}

function ViewAll({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button type="button" onClick={onClick} className="text-sm font-medium text-content-link hover:text-content-link-hover">
      {label}
    </button>
  )
}
