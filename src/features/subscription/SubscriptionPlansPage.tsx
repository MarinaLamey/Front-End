import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { ArrowUpRightIcon } from '@/shared/ui/dashboard'
import { BillingToggle } from './BillingToggle'
import { PlanCardBody } from './PlanCardBody'
import { usePlans, type Billing } from './planData'

/**
 * SubscriptionPlansPage — the dashboard "Choose your plan" screen (buyer & supplier share it,
 * rendered inside PortalShell). Reuses the same {@link BillingToggle} + {@link PlanCardBody} as
 * the onboarding PlansStep; the difference here is a per-card CTA that routes to checkout.
 * Available in every verification state — subscription is independent of KYB verification.
 */
export function SubscriptionPlansPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { items, pricing, currency, fmt } = usePlans()
  const [billing, setBilling] = useState<Billing>('annual')

  // Relative to the current /{portal}/subscription route → /{portal}/subscription/checkout.
  const goToCheckout = (plan: number) => navigate('checkout', { state: { plan, billing } })

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">{t('subscription.plansTitle')}</h1>
          <p className="mt-1 text-sm text-content-secondary">{t('subscription.plansSubtitle')}</p>
        </div>
        <BillingToggle value={billing} onChange={setBilling} />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((plan, index) => {
          const price = pricing[index] ?? {}
          const highlighted = Boolean(price.free)
          const cta = price.free
            ? t('subscription.startFree')
            : price.custom
              ? t('subscription.contactSales')
              : t('subscription.choose', { plan: plan.name })

          return (
            <div
              key={plan.name}
              className={cn(
                'flex flex-col gap-3 rounded-xl border p-5',
                highlighted ? 'border-brand-primary bg-brand-subtle' : 'border-border-subtle bg-bg-surface',
              )}
            >
              <PlanCardBody plan={plan} pricing={price} index={index} billing={billing} currency={currency} fmt={fmt} />
              <Button
                variant={price.free ? 'primary' : 'outline'}
                fullWidth
                className="mt-auto"
                onClick={() => goToCheckout(index)}
              >
                {cta}
              </Button>
            </div>
          )
        })}
      </div>

      <div className="flex justify-end">
        <Button variant="primary" rightIcon={<ArrowUpRightIcon className="h-4 w-4" />} onClick={() => goToCheckout(0)}>
          {t('subscription.startFree')}
        </Button>
      </div>
    </div>
  )
}
