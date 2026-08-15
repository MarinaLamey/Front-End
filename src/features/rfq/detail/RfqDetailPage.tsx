import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/platform/auth'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { RfqCard } from '../create/components/RfqCard'
import { ArrowLeftIcon } from '../create/components/icons'
import { useRfqDraftStore } from '../create/rfqDraftStore'
import { useExtendRfqClosing, useRfq, useSetRfqStatus } from '../hooks/rfqQueries'
import { bidOutcome, complianceMet, deriveRfqDetail } from './deriveRfqDetail'
import { RfqActionDialog } from './RfqActionDialog'
import { ExtendWindowDialog } from './ExtendWindowDialog'
import type { BidOutcome } from '../types'

const BID_TONE: Record<BidOutcome, string> = {
  negotiating: 'bg-status-info-subtle text-status-info',
  submitted: 'bg-bg-surface-sunken text-content-secondary',
  withdrawn: 'bg-bg-surface-sunken text-content-tertiary',
  declined: 'bg-bg-surface-sunken text-content-tertiary',
  expired: 'bg-bg-surface-sunken text-content-tertiary',
  won: 'bg-status-success-subtle text-status-success-strong',
  lost: 'bg-status-danger-subtle text-status-danger',
}

/** Tone vocabulary for the chip row under the breadcrumb. */
type ChipTone = 'live' | 'negotiating' | 'warning' | 'brand' | 'danger' | 'muted' | 'neutral'

const CHIP_TONE: Record<ChipTone, string> = {
  live: 'bg-status-success-subtle text-status-success-strong',
  negotiating: 'bg-status-info-subtle text-status-info',
  warning: 'bg-status-warning-subtle text-status-warning-strong',
  brand: 'bg-brand-subtle text-brand-strong',
  danger: 'bg-status-danger-subtle text-status-danger',
  muted: 'bg-bg-surface-sunken text-content-tertiary',
  neutral: 'bg-bg-surface-sunken text-content-secondary',
}

/** One row of the "RFQ status" rail. */
interface RailRow {
  label: string
  value: string
  tone?: string
}

const BIDS_GRID = 'grid grid-cols-[1.4fr_1fr_84px_92px_92px_110px] items-center gap-4'
const ITEMS_GRID = 'grid grid-cols-[28px_1.6fr_1.4fr_78px_60px_90px] items-center gap-4'

export function RfqDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { data: rfq, isLoading } = useRfq(id)
  const setStatus = useSetRfqStatus()
  const extendClosing = useExtendRfqClosing()
  const loadDraft = useRfqDraftStore((s) => s.loadDraft)
  const duplicateDraft = useRfqDraftStore((s) => s.duplicateDraft)
  const [dialog, setDialog] = useState<'amend' | 'cancel' | 'reason' | null>(null)
  const [extendOpen, setExtendOpen] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  // Read the clock once per mount: every countdown on the page then agrees with every other, and
  // a re-render can't quietly shift "3 days left" to "2".
  const [now] = useState(() => Date.now())
  const closeDialog = () => {
    setDialog(null)
    setCancelReason('')
  }

  const dateFull = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const dateTime = (iso: string) =>
    iso
      ? new Intl.DateTimeFormat(i18n.language, {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(new Date(iso))
      : '—'
  const dateShort = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso)) : '—'
  const daysUntil = (iso: string) => (iso ? Math.ceil((new Date(iso).getTime() - now) / 86_400_000) : 0)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq) {
    return (
      <div className="mx-auto w-full max-w-3xl py-16 text-center">
        <p className="text-base font-semibold text-content-primary">{t('rfq.detail.notFound')}</p>
        <Button className="mt-4" variant="outline" onClick={() => navigate('/buyer/rfqs')}>
          {t('rfq.detail.backToList')}
        </Button>
      </div>
    )
  }
  // Drafts belong in the wizard, not the detail view.
  if (rfq.status === 'draft') return <Navigate to="/buyer/rfqs/new" replace />

  const detail = deriveRfqDetail(rfq)
  const isLive = rfq.status === 'live'
  const awaiting = rfq.status === 'awaiting_verification'
  const resolved = rfq.status === 'awarded' || rfq.status === 'partially_awarded'
  const cancelled = rfq.status === 'cancelled'
  const expired = rfq.status === 'expired'
  // A LIVE RFQ keeps Amend even with bids in the table (amending resets those bids). Amend is
  // withdrawn once the buyer has OPENED a negotiation — the RFQ then reads as "Negotiating" and the
  // only change left is Extend date, which is offered in both states. A negotiation is "open" once a
  // thread is persisted on the RFQ; the bid-level Negotiating/Submitted tags are the suppliers'
  // states, not the RFQ's. There is no close-early: ending early is award (Bids tab) or cancel.
  const negotiatingCount = Object.keys(rfq.negotiations ?? {}).length
  const negotiating = isLive && negotiatingCount > 0
  const closesIn = daysUntil(rfq.closingDate)
  const notes = detail.notes || t('rfq.detail.sampleNote')
  const buyerName = user?.name || 'Sara Al-Dossary'
  const paymentTerms = `${t(`rfq.create.payment.presets.${rfq.paymentPreset}`)} ${rfq.milestones.map((m) => m.percent).join(' / ')}`
  const visibleBids = detail.bids.slice(0, 4)
  const moreBids = detail.bids.length - visibleBids.length
  const awardedAt = rfq.awards?.[0]?.awardedAt ?? ''

  // ── Chip row ───────────────────────────────────────────────────────────────
  // Every status announces itself here: what the RFQ is, how many bids it drew, and the one date
  // that matters for that status (closes / awarded / cancelled / closed).
  const chips: { text: string; tone: ChipTone }[] = []
  if (awaiting) {
    chips.push(
      { text: t('rfq.statusLabel.awaiting_verification'), tone: 'warning' },
      { text: t('rfq.detail.chips.notVisible'), tone: 'neutral' },
      { text: t('rfq.detail.chips.notPublished'), tone: 'neutral' },
    )
  } else if (negotiating) {
    chips.push({ text: t('rfq.statusLabel.negotiating'), tone: 'negotiating' })
  } else if (isLive) {
    chips.push({ text: t('rfq.statusLabel.live'), tone: 'live' })
  } else if (resolved) {
    chips.push({ text: t(`rfq.statusLabel.${rfq.status}`), tone: 'brand' })
  } else if (cancelled) {
    chips.push({ text: t('rfq.statusLabel.cancelled'), tone: 'danger' })
  } else if (expired) {
    chips.push({ text: t('rfq.statusLabel.expired'), tone: 'muted' })
  }

  // ── Right-rail rows ────────────────────────────────────────────────────────
  // The window is two explicit dates the buyer set, so an unpublished RFQ can state when it opens
  // rather than promising a countdown it cannot yet run.
  const itemsTotal = detail.lineItems.length
  const partialBidsValue = rfq.partialBidsAllowed
    ? t('rfq.detail.partialBidsAllowed', { min: rfq.minItemsPerBid, total: itemsTotal })
    : t('rfq.detail.partialBidsNone')

  const railRows: RailRow[] = awaiting
    ? [
        { label: t('rfq.detail.created'), value: dateFull(rfq.createdAt) },
        { label: t('rfq.detail.opens'), value: dateTime(rfq.openingDate) },
        { label: t('rfq.detail.closing'), value: dateTime(rfq.closingDate) },
        { label: t('rfq.detail.bidsReceived'), value: String(rfq.bids) },
        {
          label: t('rfq.detail.matchedSuppliers'),
          value: t('rfq.detail.matchedNotNotified', { count: detail.invitedSuppliers }),
        },
        { label: t('rfq.create.payment.title'), value: paymentTerms },
        { label: t('rfq.detail.partialBids'), value: partialBidsValue },
      ]
    : [
        { label: t('rfq.detail.published'), value: dateFull(rfq.openingDate || rfq.createdAt) },
        { label: t('rfq.detail.closing'), value: dateFull(rfq.closingDate) },
        {
          label: t('rfq.detail.timeLeft'),
          value: isLive && closesIn > 0 ? t('rfq.detail.daysLeft', { count: closesIn }) : t('rfq.list.closing.closed'),
          tone: isLive && closesIn > 0 ? 'text-status-warning-strong' : undefined,
        },
        { label: t('rfq.detail.bidsReceived'), value: String(rfq.bids) },
        { label: t('rfq.detail.suppliersInvited'), value: String(detail.invitedSuppliers) },
        { label: t('rfq.create.payment.title'), value: paymentTerms },
        { label: t('rfq.detail.partialBids'), value: partialBidsValue },
      ]

  const confirmAmend = () => {
    loadDraft(rfq)
    navigate('/buyer/rfqs/new')
  }
  const duplicate = () => {
    duplicateDraft(rfq)
    navigate('/buyer/rfqs/new')
  }
  // There is no close-early action: ending a live RFQ early is either an award (from Bids) or a
  // cancellation. The reason below travels with the mutation — it is shared verbatim with every
  // bidder and read back on the cancelled detail page, so it must be persisted, not dropped.
  const confirmCancel = () =>
    setStatus.mutate(
      { id, status: 'cancelled', cancelReason: cancelReason.trim() },
      { onSuccess: () => navigate('/buyer/rfqs') },
    )
  // Extend the bidding window — moves the closing date; submitted bids and open negotiations are untouched.
  const confirmExtend = (newClosingIso: string) =>
    extendClosing.mutate({ id, closingDate: newClosingIso }, { onSuccess: () => setExtendOpen(false) })

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <button
        type="button"
        onClick={() => navigate('/buyer/rfqs')}
        className="inline-flex cursor-pointer items-center gap-1.5 text-sm text-content-secondary transition-colors hover:text-content-primary"
      >
        <ArrowLeftIcon className="h-4 w-4 rtl:-scale-x-100" />
        {t('rfq.detail.back')}
      </button>

      {/* Breadcrumb */}
      <nav className="mt-4 text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/rfqs')} className="cursor-pointer hover:text-content-secondary">
          {t('rfq.title')}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{rfq.reference}</span>
      </nav>

      {/* Status chips + title */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-content-secondary">{rfq.reference}</span>
        {chips.map((chip) => (
          <span
            key={chip.text}
            className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', CHIP_TONE[chip.tone])}
          >
            {chip.text}
          </span>
        ))}
        {!awaiting && (
          <span className="text-content-secondary">{t('rfq.detail.bidsReceivedCount', { count: rfq.bids })}</span>
        )}
        {isLive && closesIn > 0 && (
          <span className="font-medium text-status-warning-strong">
            {t('rfq.detail.closesIn', { count: closesIn })}
          </span>
        )}
        {resolved && awardedAt && (
          <span className="text-content-secondary">{t('rfq.detail.chips.awardedOn', { date: dateShort(awardedAt) })}</span>
        )}
        {cancelled && (
          <span className="text-content-secondary">
            {t('rfq.detail.chips.cancelledOn', { date: dateShort(rfq.cancelledAt || rfq.updatedAt) })}
          </span>
        )}
        {expired && (
          <span className="text-content-secondary">{t('rfq.detail.chips.closedOn', { date: dateShort(rfq.closingDate) })}</span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">
        {rfq.title || t('rfq.list.untitled')}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {awaiting
          ? t('rfq.detail.createdBy', { date: dateFull(rfq.createdAt), name: buyerName })
          : t('rfq.detail.publishedBy', { date: dateFull(rfq.openingDate || rfq.createdAt), name: buyerName })}{' '}
        · {t('rfq.detail.blind')}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Bids received */}
          <RfqCard
            title={awaiting ? t('rfq.detail.bids') : t('rfq.detail.bidsReceived')}
            action={
              detail.bids.length > 0 && !awaiting ? (
                <button
                  type="button"
                  onClick={() => navigate(`/buyer/rfqs/${id}/compare`)}
                  className="cursor-pointer text-sm font-medium text-content-link hover:text-content-link-hover"
                >
                  {t('rfq.detail.compareAll', { count: detail.bids.length })}
                </button>
              ) : undefined
            }
          >
            {awaiting ? (
              <p className="text-sm text-content-tertiary">{t('rfq.detail.noBidsAwaiting')}</p>
            ) : detail.bids.length === 0 ? (
              <p className="py-6 text-center text-sm text-content-tertiary">{t('rfq.detail.noBids')}</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[660px]">
                  <div className={cn(BIDS_GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
                    <span>{t('rfq.detail.bidder')}</span>
                    <span>{t('rfq.detail.bidTotal')}</span>
                    <span>{t('rfq.detail.items')}</span>
                    <span>{t('rfq.detail.delivery')}</span>
                    <span>{t('rfq.detail.compliance')}</span>
                    <span>{t('rfq.detail.status')}</span>
                  </div>
                  <ul className="divide-y divide-border-subtle">
                    {visibleBids.map((bid) => {
                      const outcome = bidOutcome(rfq, bid)
                      return (
                        <li key={bid.id} className={cn(BIDS_GRID, 'py-3')}>
                          <span className="text-sm font-semibold text-content-primary">{bid.bidder}</span>
                          <span className="text-sm font-medium text-content-primary">
                            {formatSar(toHalalas(bid.totalSar))}
                          </span>
                          <span className="text-sm text-content-secondary">
                            {t('rfq.detail.itemsOf', { covered: bid.itemsCovered, total: bid.itemsTotal })}
                          </span>
                          <span className="text-sm text-content-secondary">{dateShort(bid.deliveryDate)}</span>
                          <span className="text-sm text-content-secondary">
                            {t('rfq.detail.itemsOf', {
                              covered: complianceMet(bid, detail.certifications),
                              total: detail.certifications.length,
                            })}
                          </span>
                          <span>
                            <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', BID_TONE[outcome])}>
                              {t(`rfq.detail.bidStatus.${outcome}`)}
                            </span>
                          </span>
                        </li>
                      )
                    })}
                  </ul>
                  <p className="mt-3 text-xs text-content-tertiary">
                    {moreBids > 0 && <>{t('rfq.detail.moreBids', { count: moreBids })} · </>}
                    {t('rfq.detail.identitiesHidden')}
                  </p>
                </div>
              </div>
            )}
          </RfqCard>

          {/* Requested items */}
          <RfqCard
            title={t('rfq.detail.requestedItems')}
            action={
              <span className="text-sm text-content-tertiary">
                {t('rfq.detail.lineItemCount', { count: itemsTotal })}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className={cn(ITEMS_GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
                  <span>#</span>
                  <span>{t('rfq.detail.description')}</span>
                  <span>{t('rfq.create.lineItems.specification')}</span>
                  <span>{t('rfq.create.lineItems.qty')}</span>
                  <span>{t('rfq.create.lineItems.unit')}</span>
                  <span>{t('rfq.detail.neededBy')}</span>
                </div>
                <ul className="divide-y divide-border-subtle">
                  {detail.lineItems.map((item, i) => (
                    <li key={item.id} className={cn(ITEMS_GRID, 'py-3')}>
                      <span className="text-sm text-content-tertiary">{i + 1}</span>
                      <span className="text-sm font-medium text-content-primary">{item.name}</span>
                      <span className="text-sm text-content-secondary">{item.specification || '—'}</span>
                      <span className="text-sm text-content-primary">
                        {item.quantity.toLocaleString(i18n.language)}
                        {/* The range a supplier must offer within, when the buyer set one. */}
                        {(item.minQuantity !== undefined || item.maxQuantity !== undefined) && (
                          <span className="block text-xs text-content-tertiary">
                            {t('rfq.detail.acceptsRange', {
                              min: (item.minQuantity ?? 0).toLocaleString(i18n.language),
                              max: (item.maxQuantity ?? item.quantity).toLocaleString(i18n.language),
                            })}
                          </span>
                        )}
                      </span>
                      <span className="text-sm text-content-secondary">{item.unit}</span>
                      <span className="text-sm text-content-secondary">{dateShort(detail.neededBy)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </RfqCard>

          {/* Requirements & compliance */}
          <RfqCard title={t('rfq.detail.requirements')}>
            <p className="text-sm font-medium text-content-secondary">{t('rfq.detail.requiredFromEvery')}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {detail.certifications.map((cert) => (
                <span key={cert} className="rounded-full bg-brand-subtle px-2.5 py-1 text-xs font-medium text-brand-strong">
                  {cert}
                </span>
              ))}
            </div>
            <p className="mt-5 text-sm font-medium text-content-secondary">{t('rfq.detail.notesToSuppliers')}</p>
            <p className="mt-1.5 text-sm text-content-secondary">{notes}</p>
          </RfqCard>
        </div>

        {/* RIGHT */}
        <div className="space-y-4">
          <RfqCard title={t('rfq.detail.rfqStatus')}>
            <dl className="space-y-3 text-sm">
              {railRows.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className="text-content-tertiary">{row.label}</dt>
                  <dd className={cn('font-medium text-end', row.tone ?? 'text-content-primary')}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </RfqCard>

          {/* Actions — one set per lifecycle state. A resolved RFQ offers no edit at all. */}
          <RfqCard>
            <div className="flex flex-col gap-2.5">
              {awaiting ? (
                <>
                  <Button fullWidth onClick={() => setDialog('amend')}>
                    {t('rfq.detail.amend')}
                  </Button>
                  <Button variant="outline" fullWidth onClick={() => setDialog('cancel')}>
                    {t('rfq.detail.cancel')}
                  </Button>
                  <p className="mt-1 text-xs text-content-tertiary">{t('rfq.detail.awaitingNote')}</p>
                </>
              ) : resolved ? (
                <>
                  <Button fullWidth onClick={() => navigate('/buyer/orders')}>
                    {t('rfq.detail.viewPurchaseOrders')}
                  </Button>
                  <Button variant="outline" fullWidth onClick={() => navigate(`/buyer/rfqs/${id}/award`)}>
                    {t('rfq.detail.viewAwardedBids')}
                  </Button>
                  <p className="mt-1 text-xs text-content-tertiary">{t('rfq.detail.awardedNote')}</p>
                </>
              ) : cancelled ? (
                <>
                  <Button fullWidth onClick={() => setDialog('reason')}>
                    {t('rfq.detail.viewCancellationReason')}
                  </Button>
                  <Button variant="outline" fullWidth onClick={duplicate}>
                    {t('rfq.detail.duplicate')}
                  </Button>
                  <p className="mt-1 text-xs text-content-tertiary">
                    {t('rfq.detail.cancelledNote', { date: dateShort(rfq.cancelledAt || rfq.updatedAt) })}
                  </p>
                </>
              ) : expired ? (
                <>
                  <Button fullWidth onClick={() => navigate(`/buyer/rfqs/${id}/compare`)}>
                    {t('rfq.detail.viewBidsReceived')}
                  </Button>
                  <Button variant="outline" fullWidth onClick={duplicate}>
                    {t('rfq.detail.duplicate')}
                  </Button>
                  <p className="mt-1 text-xs text-content-tertiary">{t('rfq.detail.expiredNote')}</p>
                </>
              ) : negotiating ? (
                <>
                  <Button fullWidth onClick={() => navigate(`/buyer/rfqs/${id}/compare`)}>
                    {t('rfq.detail.compareBids')}
                  </Button>
                  <Button variant="outline" fullWidth onClick={() => navigate('/buyer/negotiations')}>
                    {t('rfq.detail.openNegotiations')}
                  </Button>
                  <Button variant="outline" fullWidth onClick={() => setExtendOpen(true)}>
                    {t('rfq.detail.extendWindow')}
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    className="border-border-subtle text-status-danger hover:bg-status-danger-subtle"
                    onClick={() => setDialog('cancel')}
                  >
                    {t('rfq.detail.cancel')}
                  </Button>
                  <p className="mt-1 text-xs text-content-tertiary">
                    {t('rfq.detail.negotiatingNote', { count: negotiatingCount })}
                  </p>
                </>
              ) : (
                <>
                  <Button fullWidth onClick={() => navigate(`/buyer/rfqs/${id}/compare`)}>
                    {t('rfq.detail.compareBids')}
                  </Button>
                  {/* Source of truth v2.3 (12 Aug 2026, change 3): there is no close-bidding-early
                      action and no Closed status. To end early with a selection the buyer awards
                      from the Bids tab; to end early with nothing, they cancel with a reason. */}
                  <Button variant="outline" fullWidth onClick={() => setDialog('amend')}>
                    {t('rfq.detail.amend')}
                  </Button>
                  {/* Extend is available while Live as well as Negotiating (12 Aug 2026, change 6). */}
                  <Button variant="outline" fullWidth onClick={() => setExtendOpen(true)}>
                    {t('rfq.detail.extendWindow')}
                  </Button>
                  <Button
                    variant="outline"
                    fullWidth
                    className="border-border-subtle text-status-danger hover:bg-status-danger-subtle"
                    onClick={() => setDialog('cancel')}
                  >
                    {t('rfq.detail.cancel')}
                  </Button>
                  <p className="mt-1 text-xs text-content-tertiary">{t('rfq.detail.amendNote')}</p>
                </>
              )}
            </div>
          </RfqCard>
        </div>
      </div>

      <RfqActionDialog
        open={dialog === 'amend'}
        onClose={() => setDialog(null)}
        onConfirm={confirmAmend}
        title={t('rfq.detail.dialogs.amend.title')}
        badge={{ text: t('rfq.detail.dialogs.amend.badge', { count: rfq.bids }), tone: 'danger' }}
        body={t('rfq.detail.dialogs.amend.body')}
        callout={{
          heading: t('rfq.detail.dialogs.amend.calloutHeading'),
          tone: 'danger',
          bullets: [
            t('rfq.detail.dialogs.amend.b1', { count: rfq.bids }),
            t('rfq.detail.dialogs.amend.b2'),
            t('rfq.detail.dialogs.amend.b3'),
            t('rfq.detail.dialogs.amend.b4'),
          ],
        }}
        confirmLabel={t('rfq.detail.dialogs.amend.confirm')}
        confirmTone="danger"
        cancelLabel={t('rfq.detail.dialogs.amend.cancel')}
      />

      <RfqActionDialog
        open={dialog === 'cancel'}
        onClose={closeDialog}
        onConfirm={confirmCancel}
        loading={setStatus.isPending}
        title={t('rfq.detail.dialogs.cancel.title')}
        badge={{ text: rfq.reference, tone: 'neutral' }}
        body={t('rfq.detail.dialogs.cancel.body')}
        callout={{
          heading: t('rfq.detail.dialogs.cancel.calloutHeading'),
          tone: 'danger',
          bullets: [
            t('rfq.detail.dialogs.cancel.b1', { count: rfq.bids }),
            t('rfq.detail.dialogs.cancel.b2'),
            t('rfq.detail.dialogs.cancel.b3'),
          ],
        }}
        reason={{
          value: cancelReason,
          onChange: setCancelReason,
          label: t('rfq.detail.dialogs.cancel.reasonLabel'),
          placeholder: t('rfq.detail.dialogs.cancel.reasonPlaceholder'),
          min: 20,
          max: 500,
        }}
        confirmLabel={t('rfq.detail.dialogs.cancel.confirm')}
        confirmTone="danger"
        cancelLabel={t('rfq.detail.dialogs.cancel.keep')}
      />

      {/* The reason the buyer gave, read back — the same text every bidder was sent. */}
      <Modal open={dialog === 'reason'} onClose={() => setDialog(null)} labelledBy="rfq-cancel-reason-title">
        <div className="flex items-start justify-between gap-3">
          <h2 id="rfq-cancel-reason-title" className="text-lg font-bold text-content-primary">
            {t('rfq.detail.reasonDialog.title')}
          </h2>
          <span className="shrink-0 rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
            {rfq.reference}
          </span>
        </div>
        <p className="mt-2 text-sm text-content-secondary">
          {t('rfq.detail.reasonDialog.body', { date: dateFull(rfq.cancelledAt || rfq.updatedAt) })}
        </p>
        <p className="mt-4 rounded-xl bg-bg-surface-sunken p-4 text-sm text-content-primary">
          {rfq.cancelReason || t('rfq.detail.reasonDialog.none')}
        </p>
        <div className="mt-5">
          <Button variant="outline" fullWidth onClick={() => setDialog(null)}>
            {t('common.close')}
          </Button>
        </div>
      </Modal>

      <ExtendWindowDialog
        open={extendOpen}
        reference={rfq.reference}
        currentClosing={rfq.closingDate}
        deliveryDate={rfq.requiredDeliveryDate}
        onClose={() => setExtendOpen(false)}
        onConfirm={confirmExtend}
        loading={extendClosing.isPending}
      />
    </section>
  )
}
