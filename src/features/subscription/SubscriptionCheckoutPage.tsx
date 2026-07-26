import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import { Button } from '@/shared/ui/Button'
import { useAuth } from '@/platform/auth'
import { useTenant } from '@/platform/tenancy'
import { usePlans, type Billing } from './planData'

const INPUT =
  'w-full rounded-lg border border-border-subtle bg-bg-surface px-3.5 py-2.5 text-sm text-content-primary placeholder:text-content-tertiary focus:border-border-focus focus:outline-none'

/** Mastercard-style two-disc mark (decorative). */
function CardMark() {
  return (
    <span aria-hidden="true" className="flex">
      <span className="h-5 w-5 rounded-full bg-status-danger/90" />
      <span className="-ms-2 h-5 w-5 rounded-full bg-status-warning/90" />
    </span>
  )
}

/**
 * SubscriptionCheckoutPage — "Complete your subscription": payment details + a live order summary
 * for the plan chosen on {@link SubscriptionPlansPage} (passed via router state; defaults to the
 * free Basic plan). Billed-to is the real signed-in user/org. Mock-first: no charge is made — the
 * form is UI-only until the billing API is wired.
 */
export function SubscriptionCheckoutPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const { user } = useAuth()
  const { tenant } = useTenant()
  const { items, pricing, currency, fmt } = usePlans()

  const state = (location.state ?? {}) as { plan?: number; billing?: Billing }
  const planIndex = state.plan ?? 0
  const plan = items[planIndex] ?? items[0]
  const price = pricing[planIndex] ?? pricing[0]

  const [tab, setTab] = useState<'card' | 'bank'>('card')
  const [billing, setBilling] = useState<Billing>(state.billing ?? 'annual')
  const [addOn, setAddOn] = useState(false)

  const annual = price.annual ?? 0
  const monthlyOfAnnual = Math.round(annual / 12)
  const perMonth = t('subscription.perMonthAmount', { currency, amount: fmt(monthlyOfAnnual) })
  const perYear = t('subscription.perYearAmount', { currency, amount: fmt(annual) })

  // Free trial: nothing due today. Otherwise the chosen cadence (+ add-on if selected).
  const base = billing === 'monthly' ? monthlyOfAnnual : annual
  const dueToday = price.free ? 0 : base + (addOn ? 99 : 0)

  // Trial ends 3 months out — formatted like "21 Oct 2026".
  const trialEnd = new Date()
  trialEnd.setMonth(trialEnd.getMonth() + 3)
  const trialEndLabel = trialEnd.toLocaleDateString(i18n.language === 'ar' ? 'ar-SA' : 'en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  return (
    <div className="mx-auto grid max-w-5xl gap-8 lg:grid-cols-[1.5fr_1fr]">
      {/* Left — payment details */}
      <div className="flex flex-col gap-5">
        <button
          type="button"
          onClick={() => navigate('..')}
          className="inline-flex w-fit items-center gap-1 text-sm font-medium text-content-link hover:text-content-link-hover"
        >
          ← {t('subscription.backToPlans')}
        </button>

        <div>
          <h1 className="text-2xl font-bold text-content-primary">{t('subscription.checkoutTitle')}</h1>
          <p className="mt-1 text-sm text-content-secondary">
            {price.free
              ? t('subscription.checkoutSubtitle', { plan: plan.name, date: trialEndLabel })
              : t('subscription.checkoutSubtitlePaid', { plan: plan.name })}
          </p>
        </div>

        <h2 className="text-sm font-semibold text-content-primary">{t('subscription.paymentDetails')}</h2>

        {/* Card / Bank tabs */}
        <div className="flex rounded-lg bg-bg-surface-sunken p-1 text-sm">
          {(['card', 'bank'] as const).map((option) => (
            <button
              key={option}
              type="button"
              aria-pressed={tab === option}
              onClick={() => setTab(option)}
              className={cn(
                'flex-1 rounded-md px-3 py-2 font-medium transition-colors motion-reduce:transition-none',
                tab === option ? 'bg-bg-surface text-content-primary shadow-sm' : 'text-content-tertiary hover:text-content-secondary',
              )}
            >
              {t(`subscription.${option}`)}
            </button>
          ))}
        </div>

        {tab === 'card' ? (
          <div className="flex flex-col gap-3">
            <div className="relative">
              <input className={cn(INPUT, 'pe-12')} defaultValue="1234 5678 9123 4567" aria-label={t('subscription.cardNumber')} />
              <span className="absolute inset-y-0 end-3 flex items-center">
                <CardMark />
              </span>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input className={INPUT} defaultValue="03 / 26" aria-label={t('subscription.expiry')} />
              <input className={INPUT} placeholder={t('subscription.cvc')} aria-label={t('subscription.cvc')} />
            </div>
            <select className={INPUT} defaultValue="SA" aria-label={t('subscription.country')}>
              <option value="SA">{t('subscription.saudiArabia')}</option>
            </select>
            <input className={INPUT} placeholder={t('subscription.postalCode')} aria-label={t('subscription.postalCode')} />
          </div>
        ) : (
          <p className="rounded-lg border border-border-subtle bg-bg-surface-sunken p-4 text-sm text-content-secondary">
            {t('subscription.bankNote')}
          </p>
        )}

        <div className="mt-1">
          <h2 className="text-sm font-semibold text-content-primary">{t('subscription.billedTo')}</h2>
          <div className="mt-3 flex flex-col gap-3">
            <input className={INPUT} defaultValue={user?.name ?? ''} placeholder={t('subscription.fullName')} aria-label={t('subscription.fullName')} />
            <input className={INPUT} defaultValue={tenant.name} placeholder={t('subscription.company')} aria-label={t('subscription.company')} />
          </div>
        </div>

        <p className="text-xs text-content-tertiary">{t('subscription.cardAuthNote')}</p>
      </div>

      {/* Right — order summary */}
      <aside className="flex h-fit flex-col gap-4 rounded-2xl border border-border-subtle bg-bg-surface p-5 shadow-sm">
        <h2 className="text-base font-semibold text-content-primary">{t('subscription.billingOptions')}</h2>

        <div className="flex flex-col gap-2">
          {(['monthly', 'annual'] as Billing[]).map((option) => {
            const selected = billing === option
            return (
              <button
                key={option}
                type="button"
                aria-pressed={selected}
                onClick={() => setBilling(option)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border p-3 text-start transition-colors',
                  selected ? 'border-brand-primary bg-brand-subtle' : 'border-border-subtle hover:border-border-focus',
                )}
              >
                <span
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2',
                    selected ? 'border-brand-primary' : 'border-border-strong',
                  )}
                >
                  {selected && <span className="h-2 w-2 rounded-full bg-brand-primary" />}
                </span>
                <span className="flex-1">
                  <span className="block text-sm font-semibold text-content-primary">
                    {t(option === 'monthly' ? 'subscription.payMonthly' : 'subscription.payAnnually')}
                  </span>
                  <span className="block text-xs text-content-tertiary">{option === 'monthly' ? perMonth : perYear}</span>
                </span>
                {option === 'annual' && (
                  <span className="text-xs font-semibold text-status-success">{t('subscription.save')}</span>
                )}
              </button>
            )
          })}
        </div>

        <h3 className="text-sm font-semibold text-content-primary">{t('subscription.addOns')}</h3>
        <button
          type="button"
          aria-pressed={addOn}
          onClick={() => setAddOn((v) => !v)}
          className={cn(
            'flex items-start gap-3 rounded-xl border p-3 text-start transition-colors',
            addOn ? 'border-brand-primary bg-brand-subtle' : 'border-border-subtle hover:border-border-focus',
          )}
        >
          <span
            className={cn(
              'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2',
              addOn ? 'border-brand-primary bg-brand-primary text-brand-primary-on' : 'border-border-strong',
            )}
          >
            {addOn && <span className="text-[10px] leading-none">✓</span>}
          </span>
          <span className="flex-1">
            <span className="flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-content-primary">{t('subscription.aiMatching')} ✦</span>
              <span className="text-xs font-medium text-content-secondary">
                {t('subscription.perMonthShort', { currency, amount: '99' })}
              </span>
            </span>
            <span className="mt-0.5 block text-xs text-content-tertiary">{t('subscription.aiMatchingDesc')}</span>
          </span>
        </button>

        <div className="border-t border-border-subtle pt-4">
          <p className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-content-primary">
              {currency} {dueToday.toFixed(2)}
            </span>
            <span className="text-sm text-content-tertiary">{t('subscription.dueToday')}</span>
          </p>
          {price.free && (
            <p className="mt-2 text-xs text-content-tertiary">
              {t('subscription.thenNote', { price: perYear, date: trialEndLabel })}
            </p>
          )}
        </div>

        <Button variant="primary" fullWidth onClick={() => navigate('..')}>
          {price.free ? t('subscription.startFree') : t('subscription.confirm')}
        </Button>

        <p className="text-center text-xs text-content-tertiary">
          {t('subscription.agree')}{' '}
          <Link to="/terms" className="font-medium text-content-link hover:text-content-link-hover">
            {t('subscription.terms')}
          </Link>
        </p>
      </aside>
    </div>
  )
}
