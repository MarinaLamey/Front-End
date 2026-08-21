import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/platform/auth'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useRfqs } from '@/features/rfq/hooks/useRfqs'
import { deriveRfqDetail, isNegotiating } from '@/features/rfq/detail/deriveRfqDetail'
import { useOrganisationQuery } from '@/features/organisation/hooks/orgQueries'
import { useOrders } from '@/features/orders/hooks/orderQueries'
import { mockSeamState } from './mockSeam'
import type { Order } from '@/features/orders/types'
import type { Bid, RfqDraft } from '@/features/rfq/types'
import type { BadgeTone, TimelineStep } from '@/shared/ui/dashboard'
import type {
  BuyerDashboardData,
  ComplianceDoc,
  DashboardSeam,
  PipelineSegment,
  RfqSummary,
  StatItem,
  TrackedOrder,
} from './types'

/** Orders that are still running — a closed/cancelled/declined PO is not worth tracking. */
const LIVE_ORDER_STATUSES = new Set<Order['status']>(['awaiting_acceptance', 'in_transit', 'delivered'])

/**
 * A bid still in play. Source of truth §6.1: `activeBid = a bid not in {Withdrawn, Declined,
 * Expired}` — a withdrawn or declined bid must not make an RFQ read as "Bidding".
 */
const isActiveBid = (status: Bid['status']) => status !== 'withdrawn' && status !== 'declined' && status !== 'expired'

/** Chip colour per stored RFQ status, matching the RFQ list and the Bids inbox. */
const RFQ_STATUS_TONE: Record<RfqDraft['status'], BadgeTone> = {
  draft: 'neutral',
  awaiting_verification: 'warning',
  live: 'info',
  partially_awarded: 'brand',
  awarded: 'brand',
  cancelled: 'danger',
  expired: 'neutral',
}

/**
 * The PO lifecycle as the dashboard shows it, in order. Each step is `done` once the order has
 * passed it, `current` at the order's present position, and `upcoming` beyond — derived from the
 * order's own timestamps and status, never stored separately.
 *
 * FIVE stages, per Negotiation & Orders SoT §2.3: Order issued → Accepted by the supplier →
 * Dispatched → Delivered → Received and closed. Receiving and closing are one event carrying one
 * timestamp, so they are one step. Payment stages are out of phase 1 and deliberately absent.
 */
function trackedOrderSteps(order: Order, t: (k: string) => string): TimelineStep[] {
  const reached = [
    true, // Order issued — an Order only exists once its PO has been issued
    Boolean(order.acceptedAt),
    Boolean(order.shipment.dispatchedAt) || order.status === 'in_transit',
    Boolean(order.shipment.deliveredAt) || order.status === 'delivered',
    order.status === 'closed',
  ]
  const labels = [
    'dashboard.track.stage.issued',
    'dashboard.track.stage.accepted',
    'dashboard.track.stage.dispatched',
    'dashboard.track.stage.delivered',
    'dashboard.track.stage.receivedClosed',
  ]
  // The current step is the first one not yet reached; everything before it is done.
  const currentIndex = reached.indexOf(false)
  return labels.map((label, i) => ({
    label: t(label),
    state: reached[i] ? 'done' : i === currentIndex ? 'current' : 'upcoming',
  }))
}

/**
 * useBuyerDashboard — the buyer dashboard's data seam.
 *
 * Everything here is DERIVED from the same stores the rest of the app reads: the RFQ store for the
 * pipeline, KPIs, "My RFQs" and the action feed, the Orders store for "Track order", and the
 * Organisation record for compliance documents. It used to carry its own seed (RFQ-2024-001 … with
 * its own CR/VAT numbers), which meant the dashboard described a different company with a different
 * set of RFQs than every screen you could click through to. Deriving makes that drift impossible.
 */
export function useBuyerDashboard(): DashboardSeam {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const rfqsQuery = useRfqs()
  const orgQuery = useOrganisationQuery()
  const ordersQuery = useOrders()
  const { data: rfqs = [], isLoading: rfqsLoading } = rfqsQuery
  const { data: org, isLoading: orgLoading } = orgQuery
  const { data: orders = [], isLoading: ordersLoading } = ordersQuery

  const isLoading = rfqsLoading || orgLoading || ordersLoading

  const data = useMemo<BuyerDashboardData | undefined>(() => {
    if (!org) return undefined

    const dateShort = (iso: string) =>
      new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
    const dateDue = (iso: string) =>
      new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short' }).format(new Date(iso))

    // ── One pass over the RFQs for every count and pick the page needs. Details are derived at
    // most once per RFQ and reused, rather than re-derived per consumer.
    /** Tile: RFQs currently Live or Partially Awarded — a partial award still takes bids (§3.1). */
    let activeRfqs = 0
    /** Pipeline buckets (§3.2 / §6.1) — groupings for the reader, mutually exclusive, NOT statuses. */
    let openBucket = 0
    let biddingBucket = 0
    let negotiatingBucket = 0
    let awardedBucket = 0
    let bidsToReview = 0
    let awardDays = 0
    let awardCount = 0
    /** First live RFQ with active bids — drives the recommendations card. */
    let withBids: { rfq: RfqDraft; bidCount: number } | undefined
    /** First live RFQ carrying bids nobody has opened — drives the "bids to review" action. */
    let withUnopened: { rfq: RfqDraft; bidCount: number } | undefined
    /** First negotiation where the supplier moved last, so the buyer owes a reply. */
    let awaitingUs: { rfq: RfqDraft; bidId: string } | undefined
    /** First thread the SUPPLIER accepted — the buyer's one-tap "issue the purchase order" (§3.3). */
    let acceptedBySupplier: { rfq: RfqDraft; bidId: string } | undefined

    for (const rfq of rfqs) {
      if (rfq.status === 'awarded' || rfq.status === 'partially_awarded') {
        awardedBucket += 1
        if (rfq.status === 'partially_awarded') activeRfqs += 1
        // Avg RFQ-to-Award counts only a FULL award: §3.1 is explicit that a partial award alone
        // does not stop the clock. The clock starts at publication, not creation — a draft that sat
        // for a month before going live must not read as a month-long sourcing cycle. Records
        // written before `publishedAt` existed fall back to `createdAt`.
        const decidedAt = rfq.status === 'awarded' ? rfq.awards?.[0]?.awardedAt : undefined
        if (decidedAt) {
          const from = rfq.publishedAt ?? rfq.createdAt
          awardDays += (new Date(decidedAt).getTime() - new Date(from).getTime()) / 86_400_000
          awardCount += 1
        }
      }
      if (rfq.status !== 'live') continue

      activeRfqs += 1
      // Withdrawn/declined/expired bids are not "in play", so they neither count as bids to review
      // nor move an RFQ out of the Open bucket. "Bids to Review" narrows further to the ones nobody
      // in the organisation has opened yet — that is what the tile promises, and it is why the
      // number falls as the buyer works rather than standing still until an award.
      let activeBids = 0
      let unopenedBids = 0
      const opened = rfq.openedBidIds?.length ? new Set(rfq.openedBidIds) : undefined
      for (const bid of deriveRfqDetail(rfq).bids) {
        if (!isActiveBid(bid.status)) continue
        activeBids += 1
        if (!opened?.has(bid.id)) unopenedBids += 1
      }
      bidsToReview += unopenedBids
      // Two different picks on purpose: the action fires only while bids are still UNREAD, but the
      // recommendations stay useful for any RFQ that has bids, read or not.
      if (unopenedBids > 0 && !withUnopened) withUnopened = { rfq, bidCount: unopenedBids }
      if (activeBids > 0 && !withBids) withBids = { rfq, bidCount: activeBids }

      if (isNegotiating(rfq)) negotiatingBucket += 1
      else if (activeBids > 0) biddingBucket += 1
      else openBucket += 1

      for (const [bidId, thread] of Object.entries(rfq.negotiations ?? {})) {
        if (!acceptedBySupplier && thread.status === 'agreed' && thread.agreedBy === 'supplier') {
          acceptedBySupplier = { rfq, bidId }
        }
        // Only a still-open thread owes the buyer a reply — an agreed one owes a purchase order
        // instead, and must not raise both actions for the same supplier.
        if (!awaitingUs && thread.status === 'active' && thread.offers[thread.offers.length - 1]?.by === 'supplier') {
          awaitingUs = { rfq, bidId }
        }
      }
    }

    // ── One pass over the orders: the Completed pipeline bucket, and the most recently issued PO
    // that is still running (the one "Track order" follows).
    let closedOrders = 0
    let latest: Order | undefined
    for (const order of orders) {
      if (order.status === 'closed') closedOrders += 1
      if (!LIVE_ORDER_STATUSES.has(order.status)) continue
      if (!latest || order.issuedAt > latest.issuedAt) latest = order
    }

    const money = (sar: number) => formatSar(toHalalas(sar))

    const stats: StatItem[] = [
      { key: 'activeRfqs', value: String(activeRfqs), accent: 'brand' },
      {
        key: 'avgAward',
        value: awardCount ? t('dashboard.daysValue', { count: Math.round((awardDays / awardCount) * 10) / 10 }) : '—',
        accent: 'warning',
      },
      { key: 'bidsToReview', value: String(bidsToReview), accent: 'success' },
    ]

    /**
     * The pipeline is five BUCKETS, not statuses (§3.2 / §6.1) — they group records for the reader
     * and deliberately do not line up 1:1 with the stored status list. Draft and Awaiting
     * verification are not buckets, so the segments do NOT sum to the RFQ count. Completed counts
     * closed ORDERS, not RFQs, which is why it is the one segment sourced from the Orders store.
     */
    const pipeline: PipelineSegment[] = [
      { label: t('dashboard.pipelineBucket.open'), count: openBucket, color: 'bg-status-info' },
      { label: t('dashboard.pipelineBucket.bidding'), count: biddingBucket, color: 'bg-status-success' },
      { label: t('dashboard.pipelineBucket.negotiating'), count: negotiatingBucket, color: 'bg-status-warning' },
      { label: t('dashboard.pipelineBucket.awarded'), count: awardedBucket, color: 'bg-brand-primary' },
      { label: t('dashboard.pipelineBucket.completed'), count: closedOrders, color: 'bg-content-tertiary' },
    ]

    /** The five most recently touched RFQs — the same rows, in the same order, as the RFQ list. */
    const recent = rfqs.slice(0, 5)
    const rfqRow = (rfq: RfqDraft): RfqSummary => {
      const negotiating = isNegotiating(rfq)
      return {
        id: rfq.id,
        ref: rfq.reference,
        title: rfq.title || t('rfq.list.untitled'),
        meta:
          rfq.status === 'draft'
            ? t('dashboard.notPublished')
            : t('dashboard.bidCount', { count: deriveRfqDetail(rfq).bids.length }),
        anonymous: true,
        amount: rfq.budget > 0 ? money(rfq.budget) : null,
        status: negotiating ? t('rfq.statusLabel.negotiating') : t(`rfq.statusLabel.${rfq.status}`),
        tone: negotiating ? 'warning' : RFQ_STATUS_TONE[rfq.status],
      }
    }

    // Actions come off real state: bids sitting unreviewed, and threads where the supplier moved
    // last and is waiting on us. Each carries the route its button opens.
    const actions: BuyerDashboardData['actions'] = []
    // A supplier accepting the buyer's offer is the most urgent item on the list: the terms are
    // locked and nothing moves until the buyer issues the PO, so it leads (§3.3, added 12 Aug 2026).
    if (acceptedBySupplier) {
      const thread = acceptedBySupplier.rfq.negotiations?.[acceptedBySupplier.bidId]
      actions.push({
        id: `accepted-${acceptedBySupplier.rfq.id}-${acceptedBySupplier.bidId}`,
        kind: 'accepted',
        text: t('dashboard.action.supplierAccepted', {
          supplier: thread?.supplierLabel ?? t('dashboard.anonymousSupplier'),
          ref: acceptedBySupplier.rfq.reference,
        }),
        actionLabel: t('dashboard.action.issuePo'),
        to: `/buyer/negotiations/${acceptedBySupplier.rfq.id}/${acceptedBySupplier.bidId}`,
        primary: true,
      })
    }
    if (withUnopened) {
      actions.push({
        id: `bids-${withUnopened.rfq.id}`,
        kind: 'bid',
        text: t('dashboard.action.bidsToReview', {
          count: withUnopened.bidCount,
          title: withUnopened.rfq.title,
          ref: withUnopened.rfq.reference,
        }),
        actionLabel: t('dashboard.action.compareAward'),
        to: `/buyer/rfqs/${withUnopened.rfq.id}/compare`,
        // Only one row carries the filled button, so the eye lands on a single next step.
        primary: !acceptedBySupplier,
      })
    }
    if (awaitingUs) {
      actions.push({
        id: `nego-${awaitingUs.rfq.id}`,
        kind: 'message',
        text: t('dashboard.action.supplierReplied', { title: awaitingUs.rfq.title }),
        actionLabel: t('dashboard.action.openThread'),
        to: `/buyer/negotiations/${awaitingUs.rfq.id}/${awaitingUs.bidId}`,
      })
    }

    /**
     * Track order follows the buyer's most recently issued purchase order that is still running.
     * Identity stays hidden until the supplier accepts the PO, so the label is the anonymised one
     * until `acceptedAt` is set.
     */
    const trackedOrder: TrackedOrder | null = latest
      ? {
          id: latest.id,
          ref: latest.poNumber,
          meta: [
            latest.acceptedAt ? latest.supplierShort : (latest.supplierAnonLabel ?? t('dashboard.anonymousSupplier')),
            latest.shipment.expectedArrival ? t('dashboard.dueOn', { date: dateDue(latest.shipment.expectedArrival) }) : null,
          ]
            .filter(Boolean)
            .join(' · '),
          steps: trackedOrderSteps(latest, t),
        }
      : null

    // Compliance reads the organisation's real documents, so the CR/VAT here are the same numbers
    // the profile page and the purchase orders show. Meta = what identifies the document, plus its
    // expiry when it has one.
    const documents: ComplianceDoc[] = org.documents.map((doc) => {
      const expiry =
        doc.status === 'pending'
          ? t('org.profile.docs.pendingMeta')
          : doc.status === 'expiring'
            ? t('org.profile.docs.expiresIn', { count: doc.expiresInDays ?? 0 })
            : doc.validUntil
              ? t('org.profile.docs.expiresOn', { date: dateShort(doc.validUntil) })
              : null
      return {
        id: doc.id,
        title: doc.typeKey ? t(`org.profile.docs.type.${doc.typeKey}`) : doc.type,
        meta: [doc.reference ?? doc.fileName, expiry].filter(Boolean).join(' · '),
        status: t(`org.profile.docs.status.${doc.status}`),
      }
    })

    // Both recommendations describe the same RFQ, so its detail is derived once and shared.
    const recommendations: BuyerDashboardData['recommendations'] = []
    if (withBids) {
      const detail = deriveRfqDetail(withBids.rfq)
      const where = `${withBids.rfq.reference} · ${detail.deliverToCity}`
      recommendations.push(
        {
          id: 'rec-coverage',
          kind: 'supplier',
          title: t('dashboard.rec.supplierCoverage', { count: detail.invitedSuppliers, title: withBids.rfq.title }),
          meta: where,
          match: t('dashboard.rec.categoryRegion'),
          actionLabel: t('dashboard.action.invite'),
        },
        {
          id: 'rec-lowest',
          kind: 'bid',
          title: t('dashboard.rec.lowestBid', { title: withBids.rfq.title }),
          meta: where,
          match: t('dashboard.rec.lowestTotal'),
          actionLabel: t('dashboard.action.review'),
        },
      )
    }

    return {
      org: { name: org.identity.name, type: org.identity.type, userName: user?.name ?? '' },
      stats,
      pipeline,
      actionCount: actions.length,
      actions,
      rfqs: recent.map(rfqRow),
      trackedOrder,
      recommendations,
      documents,
      rejectionReason: t('dashboard.banner.rejectedDefault'),
    }
  }, [rfqs, org, orders, user, t, i18n.language])

  return { data, isLoading, ...mockSeamState([rfqsQuery, orgQuery, ordersQuery]) }
}
