import { Outlet, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/platform/auth'
import { ThemeToggle } from '@/platform/theme/ThemeToggle'
import { BrandLogo } from '@/shared/ui/BrandLogo'
import { Button } from '@/shared/ui/Button'
import { ShieldDocIcon } from '@/shared/ui/dashboard'

/**
 * AdminShell — the super-admin (back-office) console frame: a full-width header (logo + console
 * badge + "Exit admin") over the routed admin page. Entered via `enterAdmin()`; exiting restores
 * the parked buyer/supplier session. Deliberately separate from the buyer PortalShell — this is a
 * system-wide console, not a tenant portal.
 */
export function AdminShell() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const handleExit = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex min-h-screen flex-col bg-bg-canvas">
      <header className="flex items-center justify-between gap-4 border-b border-border-subtle bg-bg-surface px-6 py-3">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-6.5 w-26" />
          <span className="inline-flex items-center gap-1 rounded-full bg-status-ai-subtle px-2 py-0.5 text-[11px] font-semibold text-status-ai">
            <ShieldDocIcon className="h-3.5 w-3.5" />
            {t('admin.badge')}
          </span>
          <h1 className="ms-1 text-lg font-bold text-content-primary">{t('admin.title')}</h1>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle variant="labeled" />
          <span className="hidden text-sm text-content-secondary sm:block">{user?.name}</span>
          <Button variant="ghost" size="sm" onClick={handleExit}>
            {t('admin.exit')}
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  )
}
