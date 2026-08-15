import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { StatusBadge } from '@/shared/ui/dashboard'
import {
  useAcceptPurchaseOrder,
  useMarkDelivered,
  useOrder,
  useSaveShipment,
} from '../hooks/orderQueries'
import { OrderStatusTimeline, OrderedItemsTable, PaymentScheduleCard } from '../components'
import { downloadPurchaseOrderPdf } from '../purchaseOrderPdf'
import type { Shipment } from '../types'
import { SupplierPartiesCard, OrderNote, Panel } from './components'
import { supplierStatusKey, termsLocked } from './supplierOrders'
import { CertificateAttachedModal } from './CertificateAttachedModal'

const inputClass =
  'w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50'

/** The certificate the supplier attaches to a shipment — from their registration documents. */
const MILL_CERTIFICATE = 'Mill_test_certificate_batch_A.pdf'

/**
 * SupplierOrderPage — one screen, two jobs.
 *
 * Before acceptance it IS the purchase order: check every line against what was agreed, then either
 * accept (binding, locks the terms) or decline with a reason. There is no third option — the terms
 * cannot be changed, and no amendment route exists (SoT §8). After acceptance it becomes the
 * fulfilment desk: shipment updates the buyer sees immediately, and the delivery hand-off. The
 * buyer's identity appears at acceptance.
 */
export function SupplierOrderPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)

  const accept = useAcceptPurchaseOrder()
  const saveShipment = useSaveShipment()
  const markDelivered = useMarkDelivered()

  const [certificateOpen, setCertificateOpen] = useState(false)
  const [savedAt, setSavedAt] = useState<string | null>(null)
  const [form, setForm] = useState<Shipment | null>(null)

  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const dateValue = (iso?: string) => (iso ? iso.slice(0, 10) : '')

  const badge = useMemo(() => (order ? supplierStatusKey(order) : null), [order])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/supplier/orders" replace />

  const accepted = termsLocked(order)
  const resolved = order.status === 'closed' || order.status === 'cancelled' || order.status === 'declined'
  const shipment = form ?? order.shipment
  const setShipment = (patch: Partial<Shipment>) => setForm({ ...shipment, ...patch })
  // Dispatch and expected-arrival dates cannot be edited once saved (SoT §10) — changing an agreed
  // date needs the other side's consent, which is a later phase.
  const dispatchLocked = Boolean(order.shipment.dispatchedAt)
  const arrivalLocked = Boolean(order.shipment.expectedArrival)
  const shipmentStatusKey = order.status === 'delivered' ? 'delivered' : shipment.dispatchedAt ? 'inTransit' : 'notDispatched'

  const persistShipment = () =>
    saveShipment.mutate(
      { id: order.id, shipment },
      {
        onSuccess: () => {
          setForm(null)
          setSavedAt(new Date().toISOString())
        },
      },
    )

  const attachCertificate = () => {
    const certificates = [...(shipment.certificates ?? [])]
    if (!certificates.includes(MILL_CERTIFICATE)) certificates.push(MILL_CERTIFICATE)
    saveShipment.mutate(
      { id: order.id, shipment: { ...shipment, certificates } },
      { onSuccess: () => { setForm(null); setCertificateOpen(true) } },
    )
  }


  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <button
        type="button"
        onClick={() => navigate('/supplier/orders')}
        className="mp-press cursor-pointer text-sm font-medium text-content-secondary hover:text-content-primary"
      >
        ← {t('common.back')}
      </button>

      <nav className="mt-4 text-sm text-content-tertiary">
        <button
          type="button"
          onClick={() => navigate('/supplier/orders')}
          className="cursor-pointer text-content-link hover:underline"
        >
          {t('order.supplierView.title')}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{order.poNumber}</span>
      </nav>

      {savedAt && (
        <div className="mt-4">
          <OrderNote tone="success">{t('order.supplierView.shipment.saved')}</OrderNote>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
        <span className="text-xs text-content-tertiary">
          {order.poNumber}
        </span>
        {badge && (
          <StatusBadge label={t(`order.supplierView.status.${badge.key}`)} tone={badge.tone} dot={false} />
        )}
      </div>
      <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-content-primary">{order.title}</h1>

      <div className="mt-4">
        <OrderNote
          tone={accepted ? 'info' : 'info'}
          action={
            <Button size="sm" variant="outline" onClick={() => navigate(`/supplier/orders/${order.id}/conversation`)}>
              {t('order.supplierView.viewOfferHistory')}
            </Button>
          }
        >
          {accepted
            ? t('order.supplierView.acceptedNote', {
                date: dateFull(order.acceptedAt),
                version: order.offerVersion,
              })
            : t('order.supplierView.generatedNote', {
                version: order.offerVersion,
                rfq: order.rfqReference,
              })}
        </OrderNote>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <SupplierPartiesCard order={order} />

          {/* Fulfilment desk — only once the order is live and still moving. */}
          {accepted && !resolved && (
            <Panel>
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold text-content-primary">
                  {t('order.supplierView.shipment.title')}
                </h2>
                <span className="text-xs text-content-tertiary">{t('order.supplierView.shipment.buyerSees')}</span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">
                    {t('rfq.list.columns.status')}
                  </span>
                  {/* Read-only: the dispatch date below is what moves the order, and the status can
                      only ever hold one of the documented values. */}
                  <input
                    type="text"
                    readOnly
                    value={t(`order.supplierView.shipment.statusValue.${shipmentStatusKey}`)}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">
                    {t('order.supplierView.shipment.dispatchDate')}
                  </span>
                  <input
                    type="date"
                    disabled={dispatchLocked}
                    value={dateValue(shipment.dispatchedAt)}
                    onChange={(e) =>
                      setShipment({ dispatchedAt: e.target.value ? new Date(e.target.value).toISOString() : undefined })
                    }
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">
                    {t('order.supplierView.shipment.expectedArrival')}
                  </span>
                  <input
                    type="date"
                    disabled={arrivalLocked}
                    value={dateValue(shipment.expectedArrival)}
                    onChange={(e) =>
                      setShipment({ expectedArrival: e.target.value ? new Date(e.target.value).toISOString() : undefined })
                    }
                    className={inputClass}
                  />
                </label>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">
                    {t('order.supplierView.shipment.method')}
                  </span>
                  <input
                    type="text"
                    value={shipment.method ?? ''}
                    onChange={(e) => setShipment({ method: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">
                    {t('order.supplierView.shipment.references')}
                  </span>
                  <input
                    type="text"
                    value={shipment.reference ?? ''}
                    onChange={(e) => setShipment({ reference: e.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>

              <Textarea
                rows={2}
                className="mt-3"
                value={shipment.note ?? ''}
                onChange={(e) => setShipment({ note: e.target.value })}
                placeholder={t('order.supplierView.shipment.notePlaceholder')}
              />

              {(shipment.certificates ?? []).length > 0 && (
                <ul className="mt-3 space-y-2">
                  {(shipment.certificates ?? []).map((name) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-3 rounded-lg bg-status-success-subtle px-3 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm text-status-success-strong">
                        {name} · {t('order.supplierView.shipment.attachedToShipment')}
                      </span>
                      <button
                        type="button"
                        onClick={attachCertificate}
                        className="mp-press shrink-0 cursor-pointer text-sm font-medium text-content-link hover:underline"
                      >
                        {t('order.supplierView.shipment.replace')}
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-3 flex flex-wrap gap-3">
                <Button onClick={persistShipment} isLoading={saveShipment.isPending} disabled={form === null}>
                  {form === null ? t('order.supplierView.shipment.savedShort') : t('order.supplierView.shipment.save')}
                </Button>
                <Button variant="outline" onClick={attachCertificate} isLoading={saveShipment.isPending}>
                  {t('order.supplierView.shipment.attachCertificate')}
                </Button>
              </div>
            </Panel>
          )}

          <OrderedItemsTable order={order} />
          {!accepted && <PaymentScheduleCard order={order} />}
        </div>

        <div className="space-y-5">
          <OrderStatusTimeline order={order} />

          <Panel className="space-y-2.5">
            {!accepted && !resolved && (
              <>
                <Button
                  fullWidth
                  isLoading={accept.isPending}
                  onClick={() => accept.mutate(order.id)}
                >
                  {t('order.supplierView.acceptPo')}
                </Button>
                <Button fullWidth variant="outline" onClick={() => downloadPurchaseOrderPdf(order)}>
                  {t('order.supplierView.downloadPdf')}
                </Button>
                <Button
                  fullWidth
                  variant="ghost"
                  className="text-status-danger hover:bg-status-danger-subtle"
                  onClick={() => navigate(`/supplier/orders/${order.id}/decline`)}
                >
                  {t('order.supplierView.declineOrder')}
                </Button>
                <p className="pt-1 text-xs text-content-tertiary">{t('order.supplierView.acceptNote')}</p>
              </>
            )}

            {accepted && !resolved && (
              <>
                <Button
                  fullWidth
                  isLoading={markDelivered.isPending}
                  disabled={order.status === 'delivered'}
                  onClick={() => markDelivered.mutate(order.id)}
                >
                  {t('order.supplierView.markDelivered')}
                </Button>
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => navigate(`/supplier/orders/${order.id}/conversation`)}
                >
                  {t('order.supplierView.messageBuyer')}
                </Button>
                <Button fullWidth variant="outline" onClick={() => downloadPurchaseOrderPdf(order)}>
                  {t('order.supplierView.downloadPdf')}
                </Button>
                <p className="pt-1 text-xs text-content-tertiary">
                  {order.status === 'delivered'
                    ? t('order.supplierView.awaitingBuyerNote')
                    : t('order.supplierView.markDeliveredNote')}
                </p>
              </>
            )}

            {resolved && (
              <>
                <Button fullWidth variant="outline" onClick={() => navigate('/supplier/orders')}>
                  {t('order.supplierView.backToOrders')}
                </Button>
                <p className="pt-1 text-xs text-content-tertiary">
                  {t(`order.supplierView.resolvedNote.${order.status}`)}
                </p>
              </>
            )}
          </Panel>

        </div>
      </div>

      <CertificateAttachedModal
        open={certificateOpen}
        fileName={MILL_CERTIFICATE}
        onClose={() => setCertificateOpen(false)}
        onReplace={() => setCertificateOpen(false)}
      />
    </section>
  )
}
