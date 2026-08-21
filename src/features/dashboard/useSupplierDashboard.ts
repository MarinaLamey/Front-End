import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/platform/auth'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useRfqs } from '@/features/rfq/hooks/useRfqs'
import { supplierViews, type SupplierRfqView } from '@/features/rfq/supplier/deriveSupplierBid'
import { useOrganisationQuery } from '@/features/organisation/hooks/orgQueries'
import { useSupplierOrders } from '@/features/orders/hooks/orderQueries'
import { mockSeamState } from './mockSeam'
import type { Order } from '@/features/orders/types'
import type { SupplierBidStatus } from '@/features/rfq/types'
import type { BadgeTone, TimelineStep } from '@/shared/ui/dashboard'
import type {
  BuyerDashboardData,
  ComplianceDoc,
  DashboardSeam,
  PipelineSegment,
  RfqSummary,
  StatItem,
} from './types'

/**
 * Chip colour per bid status. Forced explicitly rather than inferred from the label, because
 * StatusBadge can only resolve an ENGLISH label — a translated one falls back to neutral.
 */
const BID_STATUS_TONE: Record<SupplierBidStatus, BadgeTone> = {
  invited: 'info',
  draft: 'neutral',
  submitted: 'brand',
  negotiating: 'warning',
  declined: 'neutral',
  withdrawn: 'neutral',
  expired: 'neutral',
  won: 'success',
  lost: 'neutral',
  cancelled: 'danger',
}

/** The bid states the pipeline strip shows, in lifecycle order. */
const PIPELINE: { status: SupplierBidStatus; color: string }[] = [
  { status: 'invited', color: 'bg-status-info' },
  { status: 'submitted', color: 'bg-status-success' },
  { status: 'negotiating', color: 'bg-status-warning' },
  { status: 'won', color: 'bg-brand-primary' },
  { status: 'lost', color: 'bg-content-tertiary' },
]

/**
 * The five phase-1 order stages as the SUPPLIER reads them: To review → Assign delivery →
 * In fulfilment → Awaiting buyer → Closed. There is no payment stage — payment is out of this
 * phase, so neither "Advance received" nor "Paid" exists.
 */
function orderSteps(order: Order, t: (k: string) => string): TimelineStep[] {
  const reached = [
    // The order exists because it was issued, so "To review" is reached the moment it appears.
    true,
    Boolean(order.acceptedAt),
    Boolean(order.shipment.dispatchedAt) || order.status === 'in_transit',
    Boolean(order.shipment.deliveredAt) || order.status === 'delivered',
    order.status === 'closed',
  ]
  const labels = [
    'supplier.track.stage.toReview',
    'supplier.track.stage.assignDelivery',
    'supplier.track.stage.inFulfilment',
    'supplier.track.stage.awaitingBuyer',
    'supplier.track.stage.closed',
  ]
  // The current step is the first one not yet reached; everything before it is done.
  const currentIndex = reached.indexOf(false)
  return labels.map((label, i) => ({
    label: t(label),
    state: reached[i] ? 'done' : i === currentIndex ? 'current' : 'upcoming',
  }))
}

/**
 * useSupplierDashboard — the supplier dashboard's data seam. Same shape as the buyer seam (the
 * dashboard kit is shared); `rfqs` holds the supplier's "My Bids" rows.
 *
 * Like the buyer's, everything is DERIVED — from `supplierViews()` over the RFQ store and from the
 * Organisation record — so the KPIs, the pipeline and My Bids describe the same bids the supplier
 * sees on their own pages, and the compliance documents are the org's real ones.
 */
export function useSupplierDashboard(): DashboardSeam {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const rfqsQuery = useRfqs()
  const orgQuery = useOrganisationQuery()
  const ordersQuery = useSupplierOrders()
  const { data: rfqs = [], isLoading: rfqsLoading } = rfqsQuery
  const { data: org, isLoading: orgLoading } = orgQuery
  const { data: supplierOrders = [], isLoading: ordersLoading } = ordersQuery

  const isLoading = rfqsLoading || orgLoading || ordersLoading

  const data = useMemo<BuyerDashboardData | undefined>(() => {
    if (!org) return undefined

    const dateDue = (iso: string) =>
      new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(new Date(iso))

    const views = supplierViews(rfqs)

    // One pass for every count on the page.
    const byStatus = new Map<SupplierBidStatus, number>()
    let active = 0
    let resolved = 0
    let won = 0
    for (const view of views) {
      const status = view.bid.status
      byStatus.set(status, (byStatus.get(status) ?? 0) + 1)
      if (status === 'submitted' || status === 'negotiating') active += 1
      if (status === 'won') {
        won += 1
        resolved += 1
      }
      if (status === 'lost') resolved += 1
    }

    const money = (sar: number) => formatSar(toHalalas(sar))

    // Three tiles, not four. "Payments Received (MTD)" is DEFERRED for phase 1: mimony records
    // nothing about money, so there is no confirmed-received figure to total and the tile returns in
    // a later phase rather than printing a number nothing backs.
    const stats: StatItem[] = [
      {
        // Matched RFQs not yet bid on — "Browse all" is a browsing pool and does not feed this tile.
        key: 'availableRfqs',
        value: String(views.filter((v) => v.bid.status === 'invited' && v.matchReason).length),
        accent: 'brand',
      },
      { key: 'activeBids', value: String(active), accent: 'success' },
      {
        // Won ÷ (Won + Lost). Only decided bids count, so it reads "—" until one resolves.
        key: 'winRate',
        value: resolved ? `${Math.round((won / resolved) * 100)}%` : '—',
        accent: 'warning',
      },
    ]

    const pipeline: PipelineSegment[] = PIPELINE.map(({ status, color }) => ({
      label: t(`rfq.supplier.bidStatus.${status}`),
      count: byStatus.get(status) ?? 0,
      color,
    }))

    const bidRow = (view: SupplierRfqView): RfqSummary => ({
      id: view.rfq.id,
      ref: view.rfq.reference,
      title: view.rfq.title || t('rfq.list.untitled'),
      meta: view.bid.itemsQuoted
        ? t('rfq.detail.itemsOf', { covered: view.bid.itemsQuoted, total: view.bid.itemsTotal })
        : t('rfq.supplier.bidStatus.invited'),
      anonymous: true,
      amount: view.bid.totalSar > 0 ? money(view.bid.totalSar) : null,
      status: t(`rfq.supplier.bidStatus.${view.bid.status}`),
      tone: BID_STATUS_TONE[view.bid.status],
    })

    // Actions come off real state: an invitation not yet quoted, and a buyer counter waiting on us.
    const invited = views.find((v) => v.bid.status === 'invited')
    const countered = views.find(
      (v) =>
        v.bid.status === 'negotiating' &&
        v.bid.thread?.offers[v.bid.thread.offers.length - 1]?.by === 'buyer',
    )
    const actions: BuyerDashboardData['actions'] = []
    if (invited) {
      actions.push({
        id: `inv-${invited.rfq.id}`,
        kind: 'bid',
        text: t('dashboard.action.newInvitation', { title: invited.rfq.title, ref: invited.rfq.reference }),
        actionLabel: t('dashboard.action.submitQuote'),
        to: `/supplier/rfqs/${invited.rfq.id}`,
        primary: true,
      })
    }
    if (countered) {
      actions.push({
        id: `ctr-${countered.rfq.id}`,
        kind: 'message',
        text: t('dashboard.action.buyerCountered', { title: countered.rfq.title }),
        actionLabel: t('dashboard.action.openThread'),
        to: `/supplier/negotiations/${countered.rfq.id}`,
      })
    }

    // Track order follows a PURCHASE ORDER, not a bid — the five phase-1 stages, no payment stage.
    // Null when the supplier has no order yet, so the card is hidden rather than faked.
    const latest = supplierOrders[0]
    const trackedOrder: BuyerDashboardData['trackedOrder'] = latest
      ? {
          id: latest.id,
          ref: latest.poNumber,
          meta: [
            // The buyer's identity is exchanged when this supplier accepts the purchase order.
            latest.acceptedAt ? latest.buyer.name : t('supplier.track.anonymousBuyer'),
            latest.shipment.expectedArrival
              ? t('dashboard.dueOn', { date: dateDue(latest.shipment.expectedArrival) })
              : null,
          ]
            .filter(Boolean)
            .join(' · '),
          steps: orderSteps(latest, t),
        }
      : null

    const documents: ComplianceDoc[] = org.documents.map((doc) => ({
      id: doc.id,
      title: doc.type,
      meta:
        doc.status === 'pending'
          ? t('org.profile.docs.pendingMeta')
          : doc.status === 'expiring'
            ? t('org.profile.docs.expiresIn', { count: doc.expiresInDays ?? 0 })
            : doc.fileName,
      status: t(`org.profile.docs.status.${doc.status}`),
    }))

    return {
      org: { name: org.identity.name, type: org.identity.type, userName: user?.name ?? '' },
      stats,
      pipeline,
      actionCount: actions.length,
      actions,
      rfqs: views.slice(0, 5).map(bidRow),
      trackedOrder,
      // Suggested RFQs — a plain region + category match. No fit score and no percentage: scoring is
      // a later-phase feature, so a suggestion that carries no `matchReason` is not a suggestion.
      recommendations: views
        .filter((v) => v.bid.status === 'invited' && v.matchReason)
        .slice(0, 2)
        .map((v) => ({
          id: `rec-${v.rfq.id}`,
          kind: 'bid' as const,
          title: v.rfq.title || t('rfq.list.untitled'),
          meta: `${v.rfq.reference} · ${v.detail.deliverToCity}`,
          match: t(`rfq.supplier.available.match.${v.matchReason}`),
          actionLabel: t('dashboard.action.bidNow'),
          to: `/supplier/rfqs/${v.rfq.id}`,
        })),
      documents,
      rejectionReason: t('dashboard.banner.rejectedDefault'),
    }
  }, [rfqs, org, supplierOrders, user, t, i18n.language])

  return { data, isLoading, ...mockSeamState([rfqsQuery, orgQuery, ordersQuery]) }
}
