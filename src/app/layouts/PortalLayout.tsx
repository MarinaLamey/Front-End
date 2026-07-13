import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { useAuth } from '@/platform/auth'
import { BrandLogo } from '@/shared/ui/BrandLogo'
import { useTenant } from '@/platform/tenancy'
import { LanguageToggle } from '@/platform/i18n'
import type { PortalConfig } from '@/app/portals'

/** Authenticated portal shell: tenant-branded sidebar nav + topbar + routed content. */
export function PortalLayout({ portal }: { portal: PortalConfig }) {
  const { t } = useTranslation()
  const { user, logout } = useAuth()
  const { tenant } = useTenant()

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="flex w-60 shrink-0 flex-col border-e border-slate-200 bg-white">
        <div className="border-b border-slate-200 px-5 py-4">
          <BrandLogo className="mb-2 h-7 w-auto" />
          <p className="font-semibold tracking-tight text-content-primary">{tenant.name}</p>
          <p className="text-xs text-content-tertiary">
            {t('common.portalLabel', { name: t(portal.label) })}
          </p>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {portal.nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2 text-sm',
                  isActive
                    ? 'bg-brand-primary/10 font-medium text-brand-primary'
                    : 'text-content-primary hover:bg-interactive-hover',
                )
              }
            >
              {t(item.label)}
            </NavLink>
          ))}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-end gap-4 border-b border-slate-200 bg-white px-6 py-3">
          <LanguageToggle />
          <span className="text-sm text-content-primary">{user?.name}</span>
          <button
            type="button"
            onClick={logout}
            className="text-sm text-content-link hover:text-content-link-hover"
          >
            {t('common.signOut')}
          </button>
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
