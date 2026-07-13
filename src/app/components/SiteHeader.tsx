import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShimmerButton } from '@/shared/ui/ShimmerButton'
import { MorphButton } from '@/shared/ui/MorphButton'
import { BrandLogo } from '@/shared/ui/BrandLogo'
import { useTenant } from '@/platform/tenancy'
import { LanguageToggle } from '@/platform/i18n'
import { HeaderNav } from './HeaderNav'

interface SiteHeaderProps {
  /** Show the marketing nav links. On by default; hidden on focused pages like auth. */
  showLinks?: boolean
}

/** Shared top navigation used across public surfaces (landing, auth). */
export function SiteHeader({ showLinks = true }: SiteHeaderProps) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { tenant } = useTenant()

  // Let the click shimmer sweep before the route swaps the header out from under it.
  const goAfterShimmer = (path: string) => window.setTimeout(() => navigate(path), 650)

  return (
    <header className="sticky top-0 z-20 flex h-[76px] items-center gap-4 border-b border-border-subtle bg-bg-surface px-6 md:px-12">
      <div className="flex flex-1 items-center gap-8">
        <Link to="/" className="flex items-center gap-2">
          <BrandLogo className="h-8 w-auto shrink-0" />
          <span className="text-base font-semibold tracking-tight text-content-primary">
            {tenant.name}
          </span>
        </Link>
        {showLinks && <HeaderNav />}
      </div>
      <div className="flex items-center gap-3">
        <LanguageToggle />
        <ShimmerButton
          trigger="click"
          onClick={() => goAfterShimmer('/login')}
          className="inline-flex h-[50px] items-center justify-center rounded-lg px-5 text-sm font-medium text-content-primary hover:bg-interactive-hover"
        >
          {t('marketing.nav.signIn')}
        </ShimmerButton>
        <MorphButton
          to="/register"
          tone="onLight"
          label={t('marketing.nav.getStarted')}
          hoverLabel={t('marketing.hero.growWithUs')}
        />
      </div>
    </header>
  )
}
