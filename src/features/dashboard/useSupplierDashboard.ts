import { useAuth } from '@/platform/auth'
import { useTenant } from '@/platform/tenancy'
import type { BuyerDashboardData } from './types'

/**
 * useSupplierDashboard — the single data seam for the supplier dashboard. Same shape as the buyer
 * seam (the dashboard kit is shared); today it returns local seed data matching the Figma, with the
 * org name pulled from the tenant. Swap this one file for the API later and the page is unchanged.
 * The `rfqs` field holds the supplier's "My Bids" rows (same row shape as the buyer's RFQs).
 */
export function useSupplierDashboard(): BuyerDashboardData {
  const { user } = useAuth()
  const { tenant } = useTenant()

  return {
    org: {
      name: tenant.name,
      type: 'Goods & Services',
      userName: user?.name ?? '',
    },

    stats: [
      { key: 'availableRfqs', value: '32', label: 'Available RFQs', accent: 'brand', delta: { label: '+5', tone: 'positive' } },
      { key: 'activeBids', value: '15', label: 'Active Bids', accent: 'success', delta: { label: '+3', tone: 'positive' } },
      { key: 'winRate', value: '38%', label: 'Win rate', accent: 'warning', delta: { label: '+6%', tone: 'positive' } },
      { key: 'revenue', value: 'SAR 1.8M', label: 'Revenue (MTD)', accent: 'secondary', delta: { label: '+12%', tone: 'attention' } },
    ],

    pipeline: [
      { label: 'Invited', count: 3, color: 'bg-status-info' },
      { label: 'Bidding', count: 5, color: 'bg-status-success' },
      { label: 'Negotiating', count: 2, color: 'bg-status-warning' },
      { label: 'Won', count: 4, color: 'bg-brand-primary' },
      { label: 'Paid', count: 12, color: 'bg-status-success' },
    ],

    actionCount: 5,
    actions: [
      { id: 'a1', kind: 'bid', text: 'New RFQ invitation: Steel Rebar (RFQ-2024-001)', actionLabel: 'Submit quote', primary: true },
      { id: 'a2', kind: 'message', text: 'Buyer countered your offer · Office Equipment', actionLabel: 'Open chat' },
    ],

    // My Bids rows.
    rfqs: [
      { id: 'b1', ref: 'RFQ-2024-001', title: 'Construction Materials - Steel Rebar', meta: '5 bids', anonymous: true, amount: 'SAR 150,000', status: 'Bidding' },
      { id: 'b2', ref: 'RFQ-2024-002', title: 'Office Equipment - IT Hardware', meta: '3 bids', anonymous: true, amount: 'SAR 45,000', status: 'Negotiating' },
      { id: 'b3', ref: 'RFQ-2024-003', title: 'Medical Supplies - PPE', meta: '12 bids', anonymous: true, amount: 'SAR 85,000', status: 'Won' },
      { id: 'b4', ref: 'RFQ-2024-005', title: 'Cement & Aggregates', meta: 'milestone 2 of 3', anonymous: true, amount: 'SAR 220,000', status: 'In payout' },
      { id: 'b5', ref: 'RFQ-2024-006', title: 'Steel Beams - Grade 60', meta: 'not published', anonymous: true, amount: null, status: 'Invited' },
    ],

    trackedOrder: {
      ref: 'RFQ-2024-001',
      meta: '5 bids · closes in 2 days',
      steps: [
        { label: 'Invited', state: 'done' },
        { label: 'Quote submitted', state: 'done' },
        { label: 'Negotiating', state: 'current', note: null },
        { label: 'Won', state: 'upcoming' },
        { label: 'Escrow funded', state: 'upcoming' },
        { label: 'Delivery', state: 'upcoming' },
        { label: 'Paid', state: 'upcoming' },
      ],
    },

    recommendations: [
      { id: 'rec1', kind: 'supplier', title: 'Your catalogue matches 4 open RFQs', meta: 'Steel & rebar · Riyadh · closes in 3 days', match: '92% fit', actionLabel: 'Bid now' },
      { id: 'rec2', kind: 'bid', title: 'High win-probability RFQ: Cement supply', meta: 'Riyadh · est. SAR 480k · 88% fit', match: '88% fit', actionLabel: 'View' },
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
