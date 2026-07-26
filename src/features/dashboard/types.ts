import type { TimelineStep } from '@/shared/ui/dashboard'

/** One KPI tile's data. */
export interface StatItem {
  key: string
  /** Pre-formatted value for the verified state. */
  value: string
  label: string
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
  kind: 'bid' | 'message'
  text: string
  /** Label of the trailing button. */
  actionLabel: string
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
  status: string
}

/** An "AI recommendations" row. */
export interface Recommendation {
  id: string
  kind: 'supplier' | 'bid'
  title: string
  meta: string
  match: string
  actionLabel: string
}

/** A "Compliance & documents" row. */
export interface ComplianceDoc {
  id: string
  title: string
  meta: string
  status: string
}

export interface TrackedOrder {
  ref: string
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
  trackedOrder: TrackedOrder
  recommendations: Recommendation[]
  documents: ComplianceDoc[]
  rejectionReason: string
}
