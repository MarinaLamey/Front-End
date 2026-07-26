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
}

/**
 * WelcomeHero — the purple gradient banner at the top of the verified buyer dashboard: greeting,
 * org name + type chip, subtitle, and the primary "Create RFQ" action. Text is white over the
 * brand gradient; the gradient is a flat brand sweep (distinct from the auth split-panel one).
 */
export function WelcomeHero({ greeting, orgName, orgType, subtitle, onCreateRfq, createDisabled }: WelcomeHeroProps) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-[linear-gradient(120deg,#4A3F8F_0%,#51489E_45%,#6D63C6_100%)] p-6 sm:flex-row sm:items-center sm:justify-between">
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
          'inline-flex shrink-0 items-center gap-2 rounded-lg bg-white px-4 py-2.5 text-sm font-semibold text-brand-primary transition-colors',
          createDisabled ? 'cursor-not-allowed opacity-60' : 'hover:bg-white/90',
        )}
      >
        <PlusIcon className="h-4 w-4" />
        {t('dashboard.createRfq')}
      </button>
    </div>
  )
}
