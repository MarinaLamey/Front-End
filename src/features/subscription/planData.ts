import { useTranslation } from 'react-i18next'

export type Billing = 'monthly' | 'annual'

/** One subscription plan's copy (from i18n). */
export interface PlanItem {
  name: string
  badge?: string
  tagline: string
  features: string[]
}

/** A plan's pricing. `free` runs a 3-month trial; `custom` shows "Custom" instead of a number. */
export interface PlanPricing {
  annual?: number
  monthly?: number
  free?: boolean
  custom?: boolean
}

/** Badge colour per plan (index-aligned with the i18n `items`). */
export const BADGE_TONE: (string | null)[] = [
  'bg-status-success text-white', // 3 months free
  'bg-brand-primary text-brand-primary-on', // most popular
  null, // premium — no badge
  'bg-brand-primary-active text-white', // best value
]

/**
 * Demo pricing (SAR), index-aligned with the i18n `items`. Annual saves ~20% vs monthly.
 * This is the mock seam — when real billing exists, {@link usePlans} swaps this for a query
 * and every consumer (onboarding + dashboard) keeps working unchanged.
 */
const PRICING: PlanPricing[] = [
  { annual: 1990, monthly: 199, free: true },
  { annual: 5990, monthly: 625 },
  { annual: 17990, monthly: 1875 },
  { custom: true },
]

export interface PlansData {
  items: PlanItem[]
  pricing: PlanPricing[]
  currency: string
  /** Thousands-formatted amount, e.g. 1990 → "1,990". */
  fmt: (n: number) => string
}

/**
 * usePlans — the single data seam for subscription plans. Today it returns the seed copy (from
 * the shared `plans` i18n namespace) + local demo pricing; later it becomes an API query. Both
 * the onboarding PlansStep and the dashboard Subscription page read from here.
 */
export function usePlans(): PlansData {
  const { t } = useTranslation()
  return {
    items: t('plans.items', { returnObjects: true }) as PlanItem[],
    pricing: PRICING,
    currency: t('plans.currency'),
    fmt: (n: number) => n.toLocaleString('en-US'),
  }
}
