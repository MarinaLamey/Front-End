import { useAuth } from '@/platform/auth'
import { useTenant } from '@/platform/tenancy'
import type { BuyerDashboardData } from './types'

/**
 * useBuyerDashboard — the single data seam for the buyer dashboard. Today it returns local seed
 * data (matching the Figma) with the org name/user pulled from the auth + tenant context. When
 * the real API exists, THIS is the only file that changes — swap the seed for a query and every
 * consuming component keeps working unchanged.
 */
export function useBuyerDashboard(): BuyerDashboardData {
  const { user } = useAuth()
  const { tenant } = useTenant()

  return {
    org: {
      name: tenant.name,
      type: 'Goods & Services',
      userName: user?.name ?? '',
    },

    stats: [
      { key: 'activeRfqs', value: '24', label: 'Active RFQs', accent: 'brand', delta: { label: '+3', tone: 'positive' } },
      { key: 'savings', value: '23%', label: 'Savings Achieved', accent: 'success', delta: { label: '+4 pts', tone: 'positive' } },
      { key: 'avgAward', value: '6.2 days', label: 'Avg RFQ-to-Award', accent: 'warning', delta: { label: '-1.3 d', tone: 'positive' } },
      { key: 'bidsToReview', value: '5', label: 'Bids to Review', accent: 'secondary', delta: { label: '5 new', tone: 'attention' } },
    ],

    pipeline: [
      { label: 'Open', count: 3, color: 'bg-status-info' },
      { label: 'Bidding', count: 5, color: 'bg-status-success' },
      { label: 'Negotiating', count: 2, color: 'bg-status-warning' },
      { label: 'Awarded', count: 4, color: 'bg-brand-primary' },
      { label: 'Completed', count: 12, color: 'bg-status-success' },
    ],

    actionCount: 5,
    actions: [
      { id: 'a1', kind: 'bid', text: '5 new bids to review on Steel Rebar RFQ (RFQ-2024-001)', actionLabel: 'Compare & Award', primary: true },
      { id: 'a2', kind: 'message', text: 'Supplier replied in negotiation · Office Equipment', actionLabel: 'Open chat' },
    ],

    rfqs: [
      { id: 'r1', ref: 'RFQ-2024-001', title: 'Construction Materials - Steel Rebar', meta: '5 bids', anonymous: true, amount: 'SAR 150,000', status: 'Bidding' },
      { id: 'r2', ref: 'RFQ-2024-002', title: 'Office Equipment - IT Hardware', meta: '3 bids', anonymous: true, amount: 'SAR 45,000', status: 'Negotiating' },
      { id: 'r3', ref: 'RFQ-2024-003', title: 'Medical Supplies - PPE', meta: '12 bids', anonymous: true, amount: 'SAR 85,000', status: 'Awarded' },
      { id: 'r4', ref: 'RFQ-2024-005', title: 'Cement & Aggregates', meta: 'milestone 2 of 3', anonymous: true, amount: 'SAR 220,000', status: 'In escrow' },
      { id: 'r5', ref: 'RFQ-2024-006', title: 'Steel Beams - Grade 60', meta: 'not published', anonymous: true, amount: null, status: 'Draft' },
    ],

    trackedOrder: {
      ref: 'RFQ-2024-001',
      meta: '5 bids · closes in 2 days',
      steps: [
        { label: 'Published', state: 'done' },
        { label: 'Bids received', state: 'done' },
        { label: 'Negotiating', state: 'current', note: null },
        { label: 'Award', state: 'upcoming' },
        { label: 'Escrow funded', state: 'upcoming' },
        { label: 'Delivery', state: 'upcoming' },
        { label: 'Completed', state: 'upcoming' },
      ],
    },

    recommendations: [
      { id: 'rec1', kind: 'supplier', title: '3 verified suppliers match your Steel Rebar RFQ', meta: 'RFQ-2024-001 · Riyadh · avg 21-day delivery', match: '94% match', actionLabel: 'Invite' },
      { id: 'rec2', kind: 'bid', title: 'Best-value bid flagged on IT Hardware', meta: 'Gulf Steel · SAR 42,900 · below market', match: '91% match', actionLabel: 'Review' },
    ],

    documents: [
      { id: 'd1', title: 'Commercial Registration (CR)', meta: '1010567890 · exp 13 Mar 2027', status: 'Valid' },
      { id: 'd2', title: 'VAT Certificate', meta: '300012345600003', status: 'Valid' },
      { id: 'd3', title: 'SASO Conformity', meta: 'Steel & rebar', status: 'Expiring 21d' },
      { id: 'd4', title: 'ISO 9001 : 2015', meta: 'Quality management', status: 'Valid' },
    ],

    rejectionReason: 'The CR number does not match Wathiq records. Please review your documents and resubmit to continue.',
  }
}
