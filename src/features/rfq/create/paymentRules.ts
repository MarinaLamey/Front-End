/* ────────────────────────────────────────────────────────────────────────────
 * PAYMENT RULES — the schedule model + validation engine for step 2.
 *
 * Pure and i18n-agnostic: it works in whole-number percentages only and returns
 * rule keys, never labels or currency (the component maps keys → text, and uses
 * `shared/lib/money` to turn percentages into exact SAR amounts). This keeps the
 * rules independently testable and reusable.
 *
 * Business rules a buyer's proposed schedule must satisfy:
 *   • 2 to 5 milestones
 *   • down payment (the advance, milestone #1) between 10% and 40%
 *   • at least one milestone paid on delivery
 *   • retention (held after inspection) at most 10%
 *   • the percentages total 100%
 * ──────────────────────────────────────────────────────────────────────────── */

/** When a milestone is paid — the values shown in the row's dropdown. */
export type MilestoneTrigger = 'on_confirmation' | 'on_delivery' | 'on_installation' | 'on_inspection'

export const MILESTONE_TRIGGERS: MilestoneTrigger[] = [
  'on_confirmation',
  'on_delivery',
  'on_installation',
  'on_inspection',
]

/** The role a trigger plays — drives the rule checks and the split-bar segment colour. */
export type MilestoneKind = 'advance' | 'delivery' | 'installation' | 'retention'

export function kindOf(trigger: MilestoneTrigger): MilestoneKind {
  switch (trigger) {
    case 'on_confirmation':
      return 'advance'
    case 'on_delivery':
      return 'delivery'
    case 'on_installation':
      return 'installation'
    case 'on_inspection':
      return 'retention'
  }
}

export interface Milestone {
  id: string
  trigger: MilestoneTrigger
  /** Whole-number percentage of the total, 0–100. */
  percent: number
}

/** Which schedule template is selected. `custom` unlocks the editable milestone rows. */
export type PaymentPreset = 'staged' | 'fifty' | 'custom'

export const MIN_MILESTONES = 2
export const MAX_MILESTONES = 5
export const DOWN_PAYMENT_MIN = 10
export const DOWN_PAYMENT_MAX = 40
export const RETENTION_MAX = 10

export type PaymentRuleKey = 'count' | 'downPayment' | 'delivery' | 'retention' | 'total'

export const PAYMENT_RULE_ORDER: PaymentRuleKey[] = [
  'count',
  'downPayment',
  'delivery',
  'retention',
  'total',
]

export interface PaymentRuleResult {
  key: PaymentRuleKey
  ok: boolean
}

export interface PaymentValidation {
  rules: PaymentRuleResult[]
  valid: boolean
  totalPercent: number
  /** i18n suffix for the primary violation the total row explains, or null when valid. */
  reasonKey: string | null
  /** Index of the milestone row to flag (e.g. an over-cap advance), or null. */
  flaggedIndex: number | null
}

let sequence = 0

/** Stable, collision-free milestone id (crypto when available; a counter otherwise). */
export function milestoneId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  sequence += 1
  return `m_${sequence}`
}

function make(trigger: MilestoneTrigger, percent: number): Milestone {
  return { id: milestoneId(), trigger, percent }
}

/** The three built-in templates. `custom` seeds a sensible, rule-valid starting point. */
export function presetMilestones(preset: PaymentPreset): Milestone[] {
  switch (preset) {
    case 'staged':
      return [make('on_confirmation', 30), make('on_delivery', 60), make('on_inspection', 10)]
    case 'fifty':
      return [make('on_confirmation', 50), make('on_delivery', 50)]
    case 'custom':
      return [
        make('on_confirmation', 20),
        make('on_delivery', 40),
        make('on_installation', 30),
        make('on_inspection', 10),
      ]
  }
}

/** The retention held across the schedule (sum of inspection milestones). */
function retentionPercent(milestones: Milestone[]): number {
  return milestones
    .filter((m) => kindOf(m.trigger) === 'retention')
    .reduce((total, m) => total + m.percent, 0)
}

/**
 * Validate a proposed schedule against every rule at once. Returns per-rule pass/fail (for
 * the chips), overall validity (gates Next), the running total, and — when invalid — the most
 * relevant reason key plus the row to highlight.
 */
export function validatePayment(milestones: Milestone[]): PaymentValidation {
  const totalPercent = milestones.reduce((total, m) => total + m.percent, 0)
  const advance = milestones[0]

  const countOk = milestones.length >= MIN_MILESTONES && milestones.length <= MAX_MILESTONES
  const downOk =
    !!advance && advance.percent >= DOWN_PAYMENT_MIN && advance.percent <= DOWN_PAYMENT_MAX
  const deliveryOk = milestones.some((m) => kindOf(m.trigger) === 'delivery')
  const retentionOk = retentionPercent(milestones) <= RETENTION_MAX
  const totalOk = totalPercent === 100

  const rules: PaymentRuleResult[] = [
    { key: 'count', ok: countOk },
    { key: 'downPayment', ok: downOk },
    { key: 'delivery', ok: deliveryOk },
    { key: 'retention', ok: retentionOk },
    { key: 'total', ok: totalOk },
  ]

  // Surface one reason at a time, in the order a buyer can act on it.
  let reasonKey: string | null = null
  let flaggedIndex: number | null = null
  if (!totalOk) {
    reasonKey = totalPercent > 100 ? 'totalOver' : 'totalUnder'
  } else if (!downOk) {
    reasonKey = advance && advance.percent > DOWN_PAYMENT_MAX ? 'advanceMax' : 'advanceMin'
    flaggedIndex = 0
  } else if (!deliveryOk) {
    reasonKey = 'delivery'
  } else if (!retentionOk) {
    reasonKey = 'retention'
  } else if (!countOk) {
    reasonKey = milestones.length < MIN_MILESTONES ? 'countMin' : 'countMax'
  }

  return {
    rules,
    valid: rules.every((r) => r.ok),
    totalPercent,
    reasonKey,
    flaggedIndex,
  }
}