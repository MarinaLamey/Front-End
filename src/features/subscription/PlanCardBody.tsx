import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { CheckIcon } from '@/shared/ui/dashboard'
import { BADGE_TONE, type Billing, type PlanItem, type PlanPricing } from './planData'

interface PlanCardBodyProps {
  plan: PlanItem
  pricing: PlanPricing
  /** Index in the plan list — selects the badge tone. */
  index: number
  billing: Billing
  currency: string
  fmt: (n: number) => string
}

/**
 * PlanCardBody — the presentational innards of a plan card: badge, name, tagline, price block and
 * the feature list. It carries NO wrapper/interactivity so each context frames it as it needs:
 * the dashboard Subscription page wraps it in a card with a CTA.
 */
export function PlanCardBody({ plan, pricing, index, billing, currency, fmt }: PlanCardBodyProps) {
  const { t } = useTranslation()
  const price = billing === 'annual' ? pricing.annual : pricing.monthly
  const per = billing === 'annual' ? t('plans.perYear') : t('plans.perMonth')

  return (
    <>
      {/* Badge row keeps its height even without a badge so the titles align across cards. */}
      <span className="flex h-6 items-center">
        {plan.badge && BADGE_TONE[index] && (
          <span
            className={cn(
              'rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider',
              BADGE_TONE[index],
            )}
          >
            {plan.badge}
          </span>
        )}
      </span>

      <div>
        <p className="text-lg font-bold text-content-primary">{plan.name}</p>
        <p className="mt-0.5 text-sm text-content-tertiary">{plan.tagline}</p>
      </div>

      {/* Price block — fixed min-height so the feature lists start on one line across cards. */}
      <div className="flex min-h-14 flex-col justify-end">
        {pricing.custom ? (
          <p className="text-2xl font-bold text-content-primary">{t('plans.customPrice')}</p>
        ) : pricing.free ? (
          <>
            <p className="text-xl font-bold text-status-success">{t('plans.free3')}</p>
            <p className="mt-1 text-xs text-content-tertiary">
              {t('plans.then', { price: `${currency} ${fmt(price ?? 0)} ${per}` })}
            </p>
          </>
        ) : (
          <>
            <p className="text-content-primary">
              <span className="text-sm font-medium">{currency}</span>{' '}
              <span className="text-2xl font-bold">{fmt(price ?? 0)}</span>
            </p>
            <p className="mt-1 text-xs text-content-tertiary">
              {per}
              {billing === 'annual' && pricing.annual && (
                <>
                  {' '}· ≈ {currency} {fmt(Math.round(pricing.annual / 12))} {t('plans.perMonth')}
                </>
              )}
            </p>
          </>
        )}
      </div>

      <ul className="mt-1 flex w-full flex-col gap-2.5 border-t border-border-subtle pt-3">
        {plan.features.map((feature) => (
          <li key={feature} className="flex items-center gap-2 text-sm text-content-secondary">
            <span className="flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full bg-status-success text-white [&>svg]:h-3 [&>svg]:w-3">
              <CheckIcon />
            </span>
            {feature}
          </li>
        ))}
      </ul>
    </>
  )
}
