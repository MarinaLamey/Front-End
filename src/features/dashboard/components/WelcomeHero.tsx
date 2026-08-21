import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { PlusIcon } from '@/shared/ui/dashboard'
import { BuildingIcon } from '@/features/auth/components/authIcons'

interface WelcomeHeroProps {
  /** Localised greeting line (already interpolated with the user/org name). */
  greeting: string
  orgName: string
  orgType: string
  subtitle: string
  onCreateRfq: () => void
  createDisabled?: boolean
  /** CTA label — defaults to "Create RFQ" (buyer); the supplier passes "Browse RFQs". */
  ctaLabel?: string
}

/**
 * WelcomeHero — the purple gradient banner at the top of the verified buyer dashboard: greeting,
 * org name + type chip, subtitle, and the primary "Create RFQ" action. The gradient is the
 * token-backed `.mp-gradient-hero` surface (distinct from the auth split-panel one). Text is
 * plain white rather than an on-brand token because that surface stays purple in dark mode.
 */
export function WelcomeHero({ greeting, orgName, orgType, subtitle, onCreateRfq, createDisabled, ctaLabel }: WelcomeHeroProps) {
  const { t } = useTranslation()
  return (
    // `relative overflow-hidden` + `shadow-lg` so the gradient reads as a raised banner rather
    // than a flat fill; `hero-sheen` (existing primitive, already used on the landing page's
    // hero cards) plays a single light sweep once the page settles — restrained, not a loop.
    <div className="mp-gradient-hero relative flex flex-col gap-4 overflow-hidden rounded-2xl p-6 shadow-lg sm:flex-row sm:items-center sm:justify-between">
      <span aria-hidden="true" className="hero-sheen pointer-events-none absolute inset-0" style={{ animationDelay: '500ms' }} />
      <div className="min-w-0">
        <h2 className="text-2xl font-bold text-white">{greeting}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/90">
          <BuildingIcon className="h-4 w-4" />
          <span className="font-medium">{orgName}</span>
          <span className="rounded-full bg-white/15 px-2 py-0.5 text-xs">{orgType}</span>
        </div>
        <p className="mt-2 text-sm text-white/70">{subtitle}</p>
      </div>
      {/* On-gradient action: white pill, brand text — a one-off that doesn't map to a Button variant. */}
      <button
        type="button"
        onClick={onCreateRfq}
        disabled={createDisabled}
        className={cn(
          'inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-primary shadow-md transition-colors',
          createDisabled ? 'cursor-not-allowed opacity-60' : 'mp-lift hover:bg-white/90',
        )}
      >
        <PlusIcon className="h-4 w-4" />
        {ctaLabel ?? t('dashboard.createRfq')}
      </button>
    </div>
  )
}
