import { useEffect, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/platform/auth'
import { useTenant } from '@/platform/tenancy'
import { ThemeToggle } from '@/platform/theme/ThemeToggle'
import type { VerificationStatus } from '@/platform/verification'
import { useCurrentOrgMeta, useOrgVerification } from '@/features/verification'
import { BrandLogo } from '@/shared/ui/BrandLogo'
import {
  BellIcon,
  ChevronDownIcon,
  CheckCircleIcon,
  ClockIcon,
  AlertTriangleIcon,
} from '@/shared/ui/dashboard'
import { UserIcon } from '@/features/auth/components/authIcons'
import type { PortalConfig } from '@/app/portals'
import { NotificationPanel, type NotificationItem } from './NotificationPanel'

/** Close `onDismiss` when a pointer lands outside `ref` while `open`. */
function useDismiss(open: boolean, ref: React.RefObject<HTMLElement>, onDismiss: () => void) {
  useEffect(() => {
    if (!open) return
    const handler = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) onDismiss()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open, ref, onDismiss])
}

const PILL: Record<VerificationStatus, { icon: typeof ClockIcon; tone: string; key: string }> = {
  pending: { icon: ClockIcon, tone: 'bg-status-warning-subtle text-status-warning-strong', key: 'dashboard.status.pending' },
  verified: { icon: CheckCircleIcon, tone: 'bg-status-success-subtle text-status-success-strong', key: 'dashboard.status.verified' },
  rejected: { icon: AlertTriangleIcon, tone: 'bg-status-danger-subtle text-status-danger-strong', key: 'dashboard.status.rejected' },
}

/** Demo chrome — the bell content. Swap for the real notifications feed when it exists. */
const NOTIFICATIONS: NotificationItem[] = [
  { id: 'n1', kind: 'message', title: 'Gulf Steel replied to your counter-offer', time: '1 hour ago', unread: true },
  { id: 'n2', kind: 'bid', title: '5 new bids on Steel Rebar RFQ', time: '2 minutes ago', unread: true },
  { id: 'n3', kind: 'message', title: 'Gulf Steel replied to your counter-offer', time: '1 hour ago', unread: true },
  { id: 'n4', kind: 'document', title: 'SASO Conformity expires in 21 days', time: 'Yesterday' },
  { id: 'n5', kind: 'bid', title: '5 new bids on Steel Rebar RFQ', time: '2 minutes ago', unread: true },
]

/** First letters of the first two words — the avatar monogram. Empty when there's no name. */
function initials(source?: string | null): string {
  const value = (source ?? '').trim()
  if (!value) return ''
  return value
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase()
}

/**
 * PortalShell — the authenticated app frame shared by buyer & supplier: a full-width top header
 * (logo, Beta badge, page title on the left; Buyer/Supplier switch, verification pill, notification
 * bell and avatar menu on the right) with a config-driven sidebar nav beneath it. Fully tokenised,
 * so dark mode and RTL work for free. The signed-in user's name/org come from the auth + tenant
 * stores; the routed page renders in the {@link Outlet}.
 */
export function PortalShell({ portal }: { portal: PortalConfig }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { tenant } = useTenant()
  const meta = useCurrentOrgMeta()
  const { data: verification, isLoading: verificationLoading } = useOrgVerification(meta)
  const status: VerificationStatus = verification?.status ?? 'pending'

  const [bellOpen, setBellOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const bellRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  useDismiss(bellOpen, bellRef, () => setBellOpen(false))
  useDismiss(menuOpen, menuRef, () => setMenuOpen(false))

  const unread = NOTIFICATIONS.some((n) => n.unread)
  const pill = PILL[status]
  const PillIcon = pill.icon
  const monogram = initials(user?.name || tenant.name)
  // The buyer/supplier portals this account registered for — drives the switch below.
  const memberships = user?.memberships ?? [portal.id]

  return (
    <div className="flex min-h-screen flex-col bg-bg-canvas">
      {/* Full-width top header — logo, Beta badge, page title + account controls. */}
      <header className="flex items-center justify-between gap-4 border-b border-border-subtle bg-bg-surface px-6 ">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-full w-full" />
          <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
            {t('dashboard.beta')}
          </span>
          <h1 className="ms-1 text-lg font-bold text-content-primary pl-[86px]">{t('dashboard.title')}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Buyer / Supplier switch — only the role(s) this account registered for are reachable. */}
          <div className="flex rounded-[9px] bg-bg-surface-sunken p-1 text-sm">
            {(['buyer', 'supplier'] as const).map((p) => {
              const active = portal.id === p
              const available = memberships.includes(p)
              return (
                <button
                  key={p}
                  type="button"
                  aria-pressed={active}
                  disabled={!available}
                  onClick={() => available && !active && navigate(`/${p}`)}
                  title={available ? undefined : t('dashboard.roleUnavailable')}
                  className={cn(
                    'rounded-[9px] px-3 py-1 transition-colors motion-reduce:transition-none',
                    active
                      ? 'bg-bg-surface font-medium text-brand-primary shadow-sm'
                      : available
                        ? 'text-content-tertiary hover:text-content-secondary'
                        : 'cursor-not-allowed text-content-disabled',
                  )}
                >
                  {t(`portals.${p}`)}
                </button>
              )
            })}
          </div>

          {/* Verification pill — reflects the org's real KYB status from the API (read-only). While
              the status is loading, show a neutral skeleton instead of a misleading "Pending". */}
          {verificationLoading ? (
            <span aria-hidden className="inline-block h-6 w-24 rounded-full bg-bg-surface-sunken motion-safe:animate-pulse" />
          ) : (
            <span className={cn('inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold', pill.tone)}>
              <PillIcon className="h-4 w-4 stroke-2" />
              {t(pill.key)}
            </span>
          )}

          {/* Notification bell */}
          <div ref={bellRef} className="relative">
            <button
              type="button"
              onClick={() => setBellOpen((o) => !o)}
              aria-label={t('dashboard.notifications.title')}
              className="relative flex h-9 w-9 items-center justify-center rounded-lg text-content-secondary hover:bg-interactive-hover"
            >
              <BellIcon className="h-5 w-5" />
              {unread && <span className="absolute end-2 top-2 h-2 w-2 rounded-full bg-status-danger ring-2 ring-bg-surface" />}
            </button>
            {bellOpen && (
              <div className="absolute end-0 z-50 mt-2 origin-top-right motion-safe:animate-card-in">
                <NotificationPanel
                  items={NOTIFICATIONS}
                  onMarkAllRead={() => setBellOpen(false)}
                  onViewAll={() => setBellOpen(false)}
                />
              </div>
            )}
          </div>

          {/* Avatar menu */}
          <div ref={menuRef} className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              aria-label={user?.name ?? undefined}
              className="flex h-9 w-9 items-center justify-center rounded-[12px] bg-brand-subtle text-sm font-semibold text-brand-primary"
            >
              {monogram || <UserIcon className="h-4 w-4" />}
            </button>
            {menuOpen && (
              <div className="absolute end-0 z-50 mt-2 w-52 origin-top-right overflow-hidden rounded-xl border border-border-subtle bg-bg-surface shadow-xl motion-safe:animate-card-in">
                <div className="border-b border-border-subtle px-4 py-3">
                  <p className="truncate text-sm font-medium text-content-primary">{user?.name}</p>
                  <p className="truncate text-xs text-content-tertiary">{tenant.name}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    logout()
                    navigate('/login')
                  }}
                  className="w-full px-4 py-2.5 text-start text-sm text-content-secondary hover:bg-interactive-hover"
                >
                  {t('common.signOut')}
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Below the header — config-driven sidebar nav + routed content. */}
      <div className="flex min-h-0 flex-1">
        <aside className="flex w-64 shrink-0 flex-col border-e border-border-subtle bg-bg-surface">
          <nav className="flex-1 space-y-1 overflow-auto p-3">
            {portal.nav.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.end}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors',
                    isActive
                      ? 'bg-brand-subtle font-medium text-brand-primary'
                      : 'text-content-secondary hover:bg-interactive-hover hover:text-content-primary',
                  )
                }
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span className="flex-1">{t(item.label)}</span>
                {item.expandable && <ChevronDownIcon className="h-4 w-4 text-content-tertiary" />}
              </NavLink>
            ))}
          </nav>
          <div className="border-t border-border-subtle p-3">
            <ThemeToggle variant="labeled" />
          </div>
        </aside>

        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
