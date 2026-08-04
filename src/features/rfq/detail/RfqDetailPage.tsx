import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '@/platform/auth'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { RfqCard } from '../create/components/RfqCard'
import { useRfqDraftStore } from '../create/rfqDraftStore'
import { useRfq, useSetRfqStatus } from '../hooks/rfqQueries'
import { deriveRfqDetail } from './deriveRfqDetail'
import { RfqActionDialog } from './RfqActionDialog'
import type { BidStatus } from '../types'

const BID_TONE: Record<BidStatus, string> = {
  negotiating: 'bg-status-info-subtle text-status-info',
  submitted: 'bg-bg-surface-sunken text-content-secondary',
}

export function RfqDetailPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { user } = useAuth()
  const { data: rfq, isLoading } = useRfq(id)
  const setStatus = useSetRfqStatus()
  const loadDraft = useRfqDraftStore((s) => s.loadDraft)
  const [dialog, setDialog] = useState<'amend' | 'close' | 'cancel' | null>(null)

  const dateFull = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const dateShort = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso)) : '—'
  const daysUntil = (iso: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0)

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
  const isLive = rfq.status === 'open'
  const closesIn = daysUntil(rfq.closingDate)
  const notes = detail.notes || t('rfq.detail.sampleNote')
  const buyerName = user?.name || 'Sara Al-Dossary'
  const paymentTerms = `${t(`rfq.create.payment.presets.${rfq.paymentPreset}`)} ${rfq.milestones.map((m) => m.percent).join(' / ')}`
  const visibleBids = detail.bids.slice(0, 4)
  const moreBids = detail.bids.length - visibleBids.length

  const confirmAmend = () => {
    loadDraft(rfq)
    navigate('/buyer/rfqs/new')
  }
  const confirmClose = () =>
    setStatus.mutate({ id, status: 'closed' }, { onSuccess: () => navigate(`/buyer/rfqs/${id}/compare`) })
  const confirmCancel = () =>
    setStatus.mutate({ id, status: 'closed' }, { onSuccess: () => navigate('/buyer/rfqs') })

  return (
    <section className="mx-auto w-full max-w-6xl">
      {/* Breadcrumb */}
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/rfqs')} className="cursor-pointer hover:text-content-secondary">
          {t('rfq.title')}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{rfq.reference}</span>
      </nav>

      {/* Status chips + title */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-content-secondary">{rfq.reference}</span>
        {isLive && (
          <span className="rounded-full bg-status-success-subtle px-2 py-0.5 text-xs font-semibold text-status-success-strong">
            {t('rfq.statusLabel.open')}
          </span>
        )}
        <span className="text-content-secondary">
          {t('rfq.detail.bidsReceivedCount', { count: rfq.bids })}
        </span>
        {isLive && closesIn > 0 && (
          <span className="font-medium text-status-warning-strong">
            {t('rfq.list.closing.inDays', { count: closesIn })}
          </span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">
        {rfq.title || t('rfq.list.untitled')}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {t('rfq.detail.publishedBy', { date: dateFull(rfq.createdAt), name: buyerName })} · {t('rfq.detail.blind')}
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        {/* LEFT */}
        <div className="space-y-6">
          {/* Bids received */}
          <RfqCard
            title={t('rfq.detail.bidsReceived')}
            action={
              detail.bids.length > 0 ? (
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
            {detail.bids.length === 0 ? (
              <p className="py-6 text-center text-sm text-content-tertiary">{t('rfq.detail.noBids')}</p>
            ) : (
              <div className="overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className="grid grid-cols-[1.4fr_1fr_84px_92px_110px] items-center gap-4 border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary">
                    <span>{t('rfq.detail.bidder')}</span>
                    <span>{t('rfq.detail.bidTotal')}</span>
                    <span>{t('rfq.detail.items')}</span>
                    <span>{t('rfq.detail.delivery')}</span>
                    <span>{t('rfq.detail.status')}</span>
                  </div>
                  <ul className="divide-y divide-border-subtle">
                    {visibleBids.map((bid) => (
                      <li key={bid.id} className="grid grid-cols-[1.4fr_1fr_84px_92px_110px] items-center gap-4 py-3">
                        <span className="text-sm font-semibold text-content-primary">{bid.bidder}</span>
                        <span className="text-sm font-medium text-content-primary">
                          {formatSar(toHalalas(bid.totalSar))}
                        </span>
                        <span className="text-sm text-content-secondary">
                          {t('rfq.detail.itemsOf', { covered: bid.itemsCovered, total: bid.itemsTotal })}
                        </span>
                        <span className="text-sm text-content-secondary">{dateShort(bid.deliveryDate)}</span>
                        <span>
                          <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-semibold', BID_TONE[bid.status])}>
                            {t(`rfq.detail.bidStatus.${bid.status}`)}
                          </span>
                        </span>
                      </li>
                    ))}
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
                {t('rfq.detail.lineItemCount', { count: detail.lineItems.length })}
              </span>
            }
          >
            <div className="overflow-x-auto">
              <div className="min-w-[620px]">
                <div className="grid grid-cols-[28px_1.6fr_1.4fr_78px_60px_90px] items-center gap-4 border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary">
                  <span>#</span>
                  <span>{t('rfq.detail.description')}</span>
                  <span>{t('rfq.create.lineItems.specification')}</span>
                  <span>{t('rfq.create.lineItems.qty')}</span>
                  <span>{t('rfq.create.lineItems.unit')}</span>
                  <span>{t('rfq.detail.neededBy')}</span>
                </div>
                <ul className="divide-y divide-border-subtle">
                  {detail.lineItems.map((item, i) => (
                    <li key={item.id} className="grid grid-cols-[28px_1.6fr_1.4fr_78px_60px_90px] items-center gap-4 py-3">
                      <span className="text-sm text-content-tertiary">{i + 1}</span>
                      <span className="text-sm font-medium text-content-primary">{item.name}</span>
                      <span className="text-sm text-content-secondary">{item.specification || '—'}</span>
                      <span className="text-sm text-content-primary">{item.quantity.toLocaleString(i18n.language)}</span>
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
              {[
                { label: t('rfq.detail.published'), value: dateFull(rfq.createdAt) },
                { label: t('rfq.detail.closing'), value: dateFull(rfq.closingDate) },
                {
                  label: t('rfq.detail.timeLeft'),
                  value: isLive && closesIn > 0 ? t('rfq.detail.daysLeft', { count: closesIn }) : t('rfq.list.closing.closed'),
                  tone: isLive && closesIn > 0 ? 'text-status-warning-strong' : undefined,
                },
                { label: t('rfq.detail.bidsReceived'), value: String(rfq.bids) },
                { label: t('rfq.detail.suppliersInvited'), value: String(detail.invitedSuppliers) },
                { label: t('rfq.create.payment.title'), value: paymentTerms },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-3">
                  <dt className="text-content-tertiary">{row.label}</dt>
                  <dd className={cn('font-medium text-end', row.tone ?? 'text-content-primary')}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </RfqCard>

          {/* Actions */}
          <RfqCard>
            <div className="flex flex-col gap-2.5">
              {rfq.status === 'awarded' ? (
                <Button fullWidth onClick={() => navigate(`/buyer/rfqs/${id}/award`)}>
                  {t('rfq.detail.viewAward')}
                </Button>
              ) : (
                <Button fullWidth onClick={() => navigate(`/buyer/rfqs/${id}/compare`)}>
                  {t('rfq.detail.compareBids')}
                </Button>
              )}
              {isLive && (
                <>
                  <Button variant="outline" fullWidth onClick={() => setDialog('close')}>
                    {t('rfq.detail.closeEarly')}
                  </Button>
                  <Button variant="outline" fullWidth onClick={() => setDialog('amend')}>
                    {t('rfq.detail.amend')}
                  </Button>
                  <Button
                    variant="ghost"
                    fullWidth
                    className="text-status-danger hover:bg-status-danger-subtle"
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
        open={dialog === 'close'}
        onClose={() => setDialog(null)}
        onConfirm={confirmClose}
        loading={setStatus.isPending}
        title={t('rfq.detail.dialogs.close.title')}
        badge={{ text: rfq.reference, tone: 'neutral' }}
        body={t('rfq.detail.dialogs.close.body', { count: rfq.bids })}
        callout={{
          heading: t('rfq.detail.dialogs.close.calloutHeading'),
          tone: 'warning',
          bullets: [
            t('rfq.detail.dialogs.close.b1'),
            t('rfq.detail.dialogs.close.b2'),
            t('rfq.detail.dialogs.close.b3', { count: rfq.bids }),
          ],
        }}
        confirmLabel={t('rfq.detail.dialogs.close.confirm')}
        confirmTone="primary"
        cancelLabel={t('rfq.detail.dialogs.close.keep')}
      />

      <RfqActionDialog
        open={dialog === 'cancel'}
        onClose={() => setDialog(null)}
        onConfirm={confirmCancel}
        loading={setStatus.isPending}
        title={t('rfq.detail.dialogs.cancel.title')}
        badge={{ text: t('rfq.detail.dialogs.cancel.badge', { count: rfq.bids }), tone: 'danger' }}
        body={t('rfq.detail.dialogs.cancel.body')}
        callout={{
          heading: t('rfq.detail.dialogs.cancel.calloutHeading'),
          tone: 'danger',
          bullets: [
            t('rfq.detail.dialogs.cancel.b1'),
            t('rfq.detail.dialogs.cancel.b2', { count: rfq.bids }),
            t('rfq.detail.dialogs.cancel.b3'),
          ],
        }}
        confirmLabel={t('rfq.detail.dialogs.cancel.confirm')}
        confirmTone="danger"
        cancelLabel={t('rfq.detail.dialogs.cancel.keep')}
      />
    </section>
  )
}
