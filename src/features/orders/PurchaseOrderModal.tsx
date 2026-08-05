import { useTranslation } from 'react-i18next'
import { Button } from '@/shared/ui/Button'
import { Modal } from '@/shared/ui/Modal'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { orderTotals } from './lib'
import type { Order } from './types'

/** The purchase-order document preview (PO header, parties, lines, totals, terms) + download. */
export function PurchaseOrderModal({ order, open, onClose }: { order: Order; open: boolean; onClose: () => void }) {
  const { t, i18n } = useTranslation()
  const { subtotal, vat, total } = orderTotals(order)
  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateFull = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))

  const download = () => {
    const lines = order.lines
      .map((l, i) => `${i + 1}. ${l.description}  ${l.quantity} ${l.unit} × ${l.unitPriceSar.toFixed(2)} = ${(l.quantity * l.unitPriceSar).toFixed(2)}`)
      .join('\n')
    const body = `PURCHASE ORDER ${order.poNumber}\nIssued ${dateFull(order.issuedAt)} · from agreed offer v${order.offerVersion}\n\nBUYER\n${order.buyer.name}\nCR ${order.buyer.cr} · VAT ${order.buyer.vat}\n\nSUPPLIER\n${order.supplier.name}\nCR ${order.supplier.cr} · VAT ${order.supplier.vat}\n\nITEMS\n${lines}\n\nSubtotal ${money(subtotal)}\nVAT 15% ${money(vat)}\nTOTAL ${money(total)}\n\nTERMS\nPayment ${order.paymentTermsLabel}, settled offline between the parties. Delivery to ${order.shipment.deliverTo ?? '—'}.`
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }))
    const a = document.createElement('a')
    a.href = url
    a.download = `${order.poNumber}.txt`
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
    <Modal open={open} onClose={onClose} labelledBy="po-title" className="max-w-2xl p-0">
      <div className="max-h-[80vh] overflow-y-auto p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 id="po-title" className="text-lg font-bold tracking-tight text-content-primary">
              {t('order.po.title')}
            </h2>
            <p className="mt-0.5 text-xs text-content-tertiary">
              {order.poNumber} · {t('order.po.issued', { date: dateFull(order.issuedAt) })}
            </p>
          </div>
          <div className="text-end">
            <p className="text-sm font-bold text-content-link">mimony</p>
            <p className="text-xs text-content-tertiary">{t('order.po.fromOffer', { version: order.offerVersion })}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 sm:grid-cols-2">
          <Party label={t('order.buyer')} p={order.buyer} />
          <Party label={t('order.supplier')} p={order.supplier} />
        </div>

        <div className="mt-5 border-t border-border-subtle pt-3">
          {order.lines.map((l, i) => (
            <div key={i} className="grid grid-cols-[20px_minmax(0,1fr)_64px_80px_100px] items-center gap-3 border-b border-border-subtle py-2 text-sm">
              <span className="text-content-tertiary">{i + 1}</span>
              <span className="text-content-primary">{l.description}</span>
              <span className="text-end tabular-nums text-content-secondary">{l.quantity.toLocaleString(i18n.language)}</span>
              <span className="text-end tabular-nums text-content-secondary">{l.unitPriceSar.toFixed(2)}</span>
              <span className="text-end font-semibold tabular-nums text-content-primary">
                {(l.quantity * l.unitPriceSar).toLocaleString(i18n.language, { minimumFractionDigits: 2 })}
              </span>
            </div>
          ))}
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between"><dt className="text-content-tertiary">{t('order.subtotal')}</dt><dd className="tabular-nums text-content-secondary">{money(subtotal)}</dd></div>
            <div className="flex justify-between"><dt className="text-content-tertiary">{t('order.vat')}</dt><dd className="tabular-nums text-content-secondary">{money(vat)}</dd></div>
            <div className="flex justify-between border-t border-border-subtle pt-1.5"><dt className="font-semibold text-content-primary">{t('order.po.total')}</dt><dd className="font-bold tabular-nums text-content-primary">{money(total)}</dd></div>
          </dl>
        </div>

        <div className="mt-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-content-tertiary">{t('order.po.terms')}</p>
          <p className="mt-1 text-sm text-content-secondary">
            {t('order.po.termsBody', { terms: order.paymentTermsLabel, address: order.shipment.deliverTo ?? '—' })}
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
