/* ────────────────────────────────────────────────────────────────────────────
 * PAYMENT RULES — the schedule model + validation engine for step 2.
 *
 * Pure and i18n-agnostic: it works in whole-number percentages only and returns
 * rule keys, never labels or currency (the component maps keys → text, and uses
 * `shared/lib/money` to turn percentages into exact SAR amounts). This keeps the
 * rules independently testable and reusable.
 *
 * The buyer designs the schedule freely (any number of milestones, any triggers, any splits).
 * The single hard rule the proposed schedule must satisfy:
 *   • the percentages total exactly 100%
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

/**
 * There is no milestone-count bound, no advance range, no retention cap and no per-milestone
 * minimum: every one of those was withdrawn, and the only surviving rule is the 100% total.
 */
export type PaymentRuleKey = 'total'

export const PAYMENT_RULE_ORDER: PaymentRuleKey[] = ['total']

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

/**
 * Validate a proposed schedule. The buyer designs the schedule freely — the single hard rule is
 * that the milestone percentages total exactly 100%. Returns the one-rule result (for the chip),
 * overall validity (gates Next), the running total, and — when off — whether it's over or under.
 */
export function validatePayment(milestones: Milestone[]): PaymentValidation {
  const totalPercent = milestones.reduce((total, m) => total + m.percent, 0)
  const totalOk = totalPercent === 100

  const rules: PaymentRuleResult[] = [{ key: 'total', ok: totalOk }]

  return {
    rules,
    valid: totalOk,
    totalPercent,
    reasonKey: totalOk ? null : totalPercent > 100 ? 'totalOver' : 'totalUnder',
    flaggedIndex: null,
  }
}