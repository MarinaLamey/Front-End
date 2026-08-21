import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { ShimmerButton } from '@/shared/ui/ShimmerButton'
import { MorphButton } from '@/shared/ui/MorphButton'
import { BrandLogo } from '@/shared/ui/BrandLogo'
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

  // Let the click shimmer sweep before the route swaps the header out from under it.
  const goAfterShimmer = (path: string) => window.setTimeout(() => navigate(path), 650)

  return (
    // `h-[76px]` only applies from `md` up, where the logo + nav + language toggle + two CTAs are
    // already known to fit on one line (today's desktop look, untouched). Below that the language
    // toggle (~142px, both full language names) plus two CTAs comfortably exceed a phone's width,
    // so the header is allowed to wrap — first the controls drop to their own row under the logo,
    // and if that row is still too tight, `flex-wrap` on it lets the controls wrap again rather
    // than force the page to scroll horizontally.
    <header className="sticky top-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border-subtle bg-bg-surface px-4 py-3 sm:px-6 md:h-[76px] md:flex-nowrap md:py-0 md:px-12">
      <div className="flex flex-1 items-center gap-8">
        <Link to="/" className="flex items-center" aria-label="mimony home">
          <BrandLogo className="h-14 w-auto shrink-0" />
        </Link>
        {showLinks && <HeaderNav />}
      </div>
      <div className="flex flex-wrap items-center justify-end gap-3">
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
