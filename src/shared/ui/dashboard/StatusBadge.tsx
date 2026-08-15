import { cn } from '@/shared/lib/cn'

/**
 * The visual tones a status can take. Every status string across the app maps to one of these
 * so colour is decided in ONE place — add a new status to {@link STATUS_TONE}, not a new style.
 */
export type Tone = 'success' | 'warning' | 'danger' | 'info' | 'brand' | 'neutral'

const TONE_CLASS: Record<Tone, string> = {
  success: 'bg-status-success-subtle text-status-success',
  warning: 'bg-status-warning-subtle text-status-warning',
  danger: 'bg-status-danger-subtle text-status-danger',
  info: 'bg-status-info-subtle text-status-info',
  brand: 'bg-brand-subtle text-brand-strong',
  neutral: 'bg-bg-surface-sunken text-content-secondary',
}

/**
 * `strong` variants — the darker, higher-contrast on-surface text (·-strong tokens), used
 * for verification status so the label reads boldly. Only the tones with a strong token are
 * listed; others fall back to {@link TONE_CLASS}.
 */
const TONE_STRONG_CLASS: Partial<Record<Tone, string>> = {
  success: 'bg-status-success-subtle text-status-success-strong',
  warning: 'bg-status-warning-subtle text-status-warning-strong',
  danger: 'bg-status-danger-subtle text-status-danger-strong',
}

/**
 * `plain` variants — no pill, just the label in the tone's colour. Used where the design shows a
 * status as a read-only statement of where something stands (compliance documents, the KYB
 * verification rows and banner) rather than as a chip you scan a list by.
 */
const TONE_TEXT_CLASS: Record<Tone, string> = {
  success: 'text-status-success',
  warning: 'text-status-warning',
  danger: 'text-status-danger',
  info: 'text-status-info',
  brand: 'text-brand-strong',
  neutral: 'text-content-secondary',
}

const TONE_TEXT_STRONG_CLASS: Partial<Record<Tone, string>> = {
  success: 'text-status-success-strong',
  warning: 'text-status-warning-strong',
  danger: 'text-status-danger-strong',
}

/**
 * Canonical status → tone map. Keys are the lowercased status the data layer emits (RFQ,
 * order, document and verification statuses all share this table). Unknown keys fall back to
 * neutral, so a new backend status renders safely until it's given a tone here.
 */
const STATUS_TONE: Record<string, Tone> = {
  // RFQ / order lifecycle
  open: 'info',
  bidding: 'success',
  negotiating: 'warning',
  awarded: 'brand',
  'in escrow': 'brand',
  'in progress': 'brand',
  delivery: 'info',
  completed: 'success',
  draft: 'neutral',
  closed: 'neutral',
  cancelled: 'danger',
  // documents / compliance
  valid: 'success',
  expiring: 'warning',
  expired: 'danger',
  // verification
  verified: 'success',
  pending: 'warning',
  verifying: 'warning',
  rejected: 'danger',
  // supplier bid lifecycle
  invited: 'info',
  'quote submitted': 'brand',
  won: 'success',
  'in payout': 'warning',
  paid: 'success',
}

interface StatusBadgeProps {
  /** Human label shown in the pill (also used to resolve the tone, case-insensitively). */
  label: string
  /** Force a tone instead of deriving it from the label. */
  tone?: Tone
  /** Show the leading dot (default true). */
  dot?: boolean
  /** High-contrast variant: darker `-strong` text + bold weight (e.g. verification status). */
  strong?: boolean
  /** Drop the pill and render the label as coloured text only — a status statement, not a chip. */
  plain?: boolean
  className?: string
}

/**
 * StatusBadge — the one status indicator used across the app. Give it a label; it derives the
 * colour from {@link STATUS_TONE}. Renders as a pill by default (with an optional leading dot);
 * `plain` renders the same tone as bare coloured text. Purely presentational.
 */
export function StatusBadge({ label, tone, dot = true, strong = false, plain = false, className }: StatusBadgeProps) {
  const resolved = tone ?? STATUS_TONE[label.trim().toLowerCase()] ?? 'neutral'
  const toneClass = plain
    ? (strong && TONE_TEXT_STRONG_CLASS[resolved]) || TONE_TEXT_CLASS[resolved]
    : (strong && TONE_STRONG_CLASS[resolved]) || TONE_CLASS[resolved]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 text-xs',
        plain ? 'font-semibold' : cn('rounded-full px-2.5 py-0.5', strong ? 'font-bold' : 'font-medium'),
        toneClass,
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />}
      {label}
    </span>
  )
}
