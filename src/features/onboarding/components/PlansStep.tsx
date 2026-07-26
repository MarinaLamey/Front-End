import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { CheckIcon } from '@/shared/ui/dashboard'
import { BillingToggle, PlanCardBody, usePlans, type Billing } from '@/features/subscription'
import { StepFrame } from './StepFrame'
import { WizardFooter } from './WizardFooter'

interface PlansStepProps {
  onGoToDashboard: () => void
}

/**
 * PlansStep — shown right after the registration is submitted (replaces the old KYC
 * pending/approved screens): a centred "verification in review" note, then the subscription
 * plans to explore while waiting. No payment is taken — picking happens later from the
 * dashboard, so selection here is visual only (Basic pre-highlighted, as designed). The plan
 * cards + billing toggle are the shared subscription components, so this stays in step with the
 * dashboard Subscription page.
 */
export function PlansStep({ onGoToDashboard }: PlansStepProps) {
  const { t } = useTranslation()
  const { items, pricing, currency, fmt } = usePlans()
  const [billing, setBilling] = useState<Billing>('annual')
  const [selected, setSelected] = useState(0)

  return (
    <StepFrame
      footer={<WizardFooter continueLabel={t('onboarding.plans.goToDashboard')} onContinue={onGoToDashboard} />}
    >
      <div className="flex flex-col gap-6">
        {/* Centred verification notice — review continues in the background. */}
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-status-success-subtle text-status-success">
            <CheckIcon className="h-6 w-6" />
          </span>
          <div>
            <h1 className="text-2xl font-semibold text-content-primary">{t('onboarding.plans.title')}</h1>
            <p className="mt-1.5 text-base text-content-secondary">{t('onboarding.plans.subtitle')}</p>
          </div>
        </div>

        {/* Explore heading + billing toggle. */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-content-primary">{t('onboarding.plans.explore')}</h2>
            <p className="mt-1 text-sm text-content-secondary">{t('onboarding.plans.exploreSub')}</p>
          </div>
          <BillingToggle value={billing} onChange={setBilling} />
        </div>

        {/* The four plans — shared card body, wrapped in a selectable button (visual only). */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((plan, index) => (
            <button
              key={plan.name}
              type="button"
              aria-pressed={index === selected}
              onClick={() => setSelected(index)}
              className={cn(
                'flex flex-col items-start gap-3 rounded-xl p-4 text-start outline transition-colors',
                index === selected
                  ? 'bg-brand-subtle outline-[1.5px] outline-offset-[-1.5px] outline-brand-primary'
                  : 'bg-bg-surface outline-1 -outline-offset-1 outline-border-subtle hover:outline-border-focus',
              )}
            >
              <PlanCardBody
                plan={plan}
                pricing={pricing[index] ?? {}}
                index={index}
                billing={billing}
                currency={currency}
                fmt={fmt}
              />
            </button>
          ))}
        </div>
      </div>
    </StepFrame>
  )
}
