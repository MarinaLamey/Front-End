import type { BadgeTone, TimelineStep } from '@/shared/ui/dashboard'

/** One KPI tile's data. The label is resolved from `key` at render time (`dashboard.stats.*`). */
export interface StatItem {
  key: string
  /** Pre-formatted value for the verified state. */
  value: string
  accent: 'brand' | 'success' | 'warning' | 'info' | 'secondary'
  delta?: { label: string; tone: 'positive' | 'attention' }
}

/** RFQ pipeline segment (the legend strip). */
export interface PipelineSegment {
  label: string
  count: number
  /** Dot colour class. */
  color: string
}

/** An "Action Required" row. */
export interface ActionItem {
  id: string
  /** `accepted` = a supplier accepted the buyer's offer and the purchase order is owed. */
  kind: 'bid' | 'message' | 'accepted'
  text: string
  /** Label of the trailing button. */
  actionLabel: string
  /** Where the trailing button goes — a real route, so the row is actionable. */
  to: string
  primary?: boolean
}

/** A row in "My RFQs". */
export interface RfqSummary {
  id: string
  ref: string
  title: string
  meta: string
  anonymous: boolean
  amount: string | null
  /** Already-localised status label. */
  status: string
  /**
   * Chip colour, carried alongside the label. StatusBadge can only infer a tone from an ENGLISH
   * label, so a translated one would silently fall back to neutral — the tone comes from the raw
   * status instead.
   */
  tone: BadgeTone
}

/** A recommendation row — the buyer's suggested suppliers, the supplier's suggested RFQs. */
export interface Recommendation {
  id: string
  kind: 'supplier' | 'bid'
  title: string
  meta: string
  /** Why it was suggested — a plain region/category match, never a fit score or a percentage. */
  match: string
  actionLabel: string
  /** Where the trailing button goes, so the row is actionable rather than decorative. */
  to?: string
}

/** A "Compliance & documents" row. */
export interface ComplianceDoc {
  id: string
  title: string
  meta: string
  status: string
}

/** The purchase order shown in "Track order" — the buyer's most recently issued live PO. */
export interface TrackedOrder {
  /** Order record id, so the card can link through to the order. */
  id: string
  /** PO number, e.g. PO-2026-0088. */
  ref: string
  /** Supplier label (anonymised until acceptance) + the due date. */
  meta: string
  steps: TimelineStep[]
}

export interface BuyerDashboardData {
  org: { name: string; type: string; userName: string }
  stats: StatItem[]
  pipeline: PipelineSegment[]
  actionCount: number
  actions: ActionItem[]
  rfqs: RfqSummary[]
  /** Null when the buyer has no live purchase order — the card is hidden rather than faked. */
  trackedOrder: TrackedOrder | null
  recommendations: Recommendation[]
  documents: ComplianceDoc[]
  rejectionReason: string
}
