import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { isSupplierRevealed, orderTotals, supplierDisplayName } from './lib'
import { buildPurchaseOrderPdf } from './purchaseOrderPdf'
import type { Order } from './types'

/** The purchase-order document preview (PO header, parties, lines, totals, terms) + download. */
export function PurchaseOrderModal({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { subtotal, vat, total } = orderTotals(order)
  // A formal PO document always shows two decimals (SAR 88,810.00), unlike the whole-number summaries.
  const money = (n: number) => `SAR ${n.toLocaleString(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  const dateFull = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
  const dateLong = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(iso))
  const deliveryDate = dateLong(order.shipment.expectedArrival ?? order.shipment.deliveredAt ?? order.issuedAt)

  // Download the PO as a real PDF file (dependency-free generator — see purchaseOrderPdf.ts).
  const download = () => {
    const url = URL.createObjectURL(buildPurchaseOrderPdf(order))
    const a = document.createElement('a')
    a.href = url
    a.download = `${order.poNumber}.pdf`
    a.click()
    URL.revokeObjectURL(url)
  }

  const Party = ({ label, p }: { label: string; p: Order['buyer'] }) => (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">{label}</p>
      <p className="mt-1 text-sm font-bold text-content-primary">{p.name}</p>
      <p className="text-xs text-content-tertiary">CR {p.cr} · VAT {p.vat}</p>
    </div>
  )

  return (
    <Modal open={open} onClose={onClose} labelledBy="po-title" className="!max-w-3xl !p-0">
      <div className="max-h-[80vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="po-title" className="text-lg font-bold uppercase tracking-wide text-content-primary">
              {t('order.po.title')}
            </h2>
            <p className="mt-0.5 text-xs text-content-tertiary">
              {order.poNumber} · {t('order.po.issued', { date: dateFull(order.issuedAt) })}
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm font-bold text-brand-primary">mimony</p>
            <p className="text-xs text-content-tertiary">{t('order.po.fromOffer', { version: order.offerVersion })}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <Party label={t('order.buyer')} p={order.buyer} />
          {isSupplierRevealed(order) ? (
            <Party label={t('order.supplier')} p={order.supplier} />
          ) : (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">{t('order.supplier')}</p>
              <p className="mt-1 text-sm font-bold text-content-primary">{supplierDisplayName(order)}</p>
              <p className="text-xs text-content-tertiary">{t('order.supplierRevealOnAccept')}</p>
            </div>
          )}
        </div>

        <div className="mt-5 border-t border-border-subtle pt-4">
          {/* Column header — # · Description · Qty · Unit price · Line total */}
          <div className="grid grid-cols-[20px_minmax(0,1fr)_64px_80px_100px] items-center gap-3 pb-2 text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">
            <span>#</span>
            <span>{t('order.col.description')}</span>
            <span className="text-end">{t('order.col.qty')}</span>
            <span className="text-end">{t('order.col.unitPrice')}</span>
            <span className="text-end">{t('order.col.lineTotal')}</span>
          </div>
          {order.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[20px_minmax(0,1fr)_64px_80px_100px] items-center gap-3 border-t border-border-subtle py-2.5 text-sm">
              <span className="text-content-tertiary">{i + 1}</span>
              <span className="text-content-primary">{l.description}</span>
              <span className="text-end tabular-nums text-content-secondary">{l.quantity.toLocaleString(i18n.language)}</span>
              <span className="text-end tabular-nums text-content-secondary">{l.unitPriceSar.toFixed(2)}</span>
              <span className="text-end font-semibold tabular-nums text-content-primary">
                {(l.quantity * l.unitPriceSar).toLocaleString(i18n.language, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <dl className="mt-2 space-y-1 border-t border-border-subtle pt-3 text-sm">
            <div className="flex justify-between"><dt className="text-content-secondary">{t('order.subtotal')}</dt><dd className="tabular-nums text-content-primary">{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-content-secondary">{t('order.vat')}</dt><dd className="tabular-nums text-content-primary">{money(vat)}</dd></div>
            <div className="flex justify-between border-t border-border-subtle pt-2"><dt className="font-bold uppercase tracking-wide text-content-primary">{t('order.po.total')}</dt><dd className="font-bold tabular-nums text-content-primary">{money(total)}</dd></div>
          </dl>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">{t('order.po.terms')}</p>
          <p className="mt-1 text-sm text-content-secondary">
            {t('order.po.termsBody', { terms: order.paymentTermsLabel, date: deliveryDate, address: order.shipment.deliverTo ?? '—' })}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 rounded-b-2xl border-t border-border-subtle bg-bg-surface-sunken px-6 py-4">
        <span className="text-sm text-content-tertiary">{order.poNumber}.pdf</span>
        <div className="flex gap-2">
          <Button size="sm" onClick={download}>{t('order.po.download')}</Button>
          <Button size="sm" variant="outline" onClick={onClose}>{t('order.po.close')}</Button>
        </div>
      </div>
    </Modal>
  )
}
