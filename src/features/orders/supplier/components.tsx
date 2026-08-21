import { useTranslation } from 'react-i18next'
import { cn } from '@/shared/lib/cn'
import type { Order } from '../types'

/** One party's registered identity — hoisted so it isn't re-created on every render. */
function Party({ label, party }: { label: string; party: Order['buyer'] }) {
  return (
    <div>
      <p className="text-xs font-medium text-content-tertiary">{label}</p>
      <p className="mt-1 text-sm font-bold text-content-primary">{party.name}</p>
      <p className="mt-0.5 text-xs text-content-tertiary">
        CR {party.cr} · VAT {party.vat}
      </p>
      <p className="text-xs text-content-tertiary">{party.location}</p>
    </div>
  )
}

/**
 * Buyer + supplier identity from the SUPPLIER's end. The mirror of the buyer's card: there the
 * supplier is masked until they accept, here it is the BUYER who stays anonymous until this
 * supplier accepts the purchase order. Identities are exchanged at that one moment, both ways.
 */
export function SupplierPartiesCard({ order }: { order: Order }) {
  const { t } = useTranslation()
  const accepted = order.acceptedAt != null

  return (
    <div className="grid gap-6 rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5 sm:grid-cols-2">
      {accepted ? (
        <Party label={t('order.buyer')} party={order.buyer} />
      ) : (
        <div>
          <p className="text-xs font-medium text-content-tertiary">{t('order.buyer')}</p>
          <p className="mt-1 text-sm font-bold text-content-primary">{t('order.supplierView.verifiedBuyer')}</p>
          <p className="mt-0.5 text-xs text-content-tertiary">{t('order.supplierView.buyerRevealOnAccept')}</p>
        </div>
      )}
      <Party label={t('order.supplier')} party={order.supplier} />
    </div>
  )
}

/** Full-width notice above the fold — the one line telling the supplier where the order stands. */
export function OrderNote({
  tone,
  children,
  action,
}: {
  tone: 'info' | 'success' | 'warning' | 'danger'
  children: React.ReactNode
  action?: React.ReactNode
}) {
  const toneClass = {
    info: 'bg-brand-subtle/50 text-content-secondary',
    success: 'bg-status-success-subtle text-status-success-strong',
    warning: 'bg-status-warning-subtle text-status-warning-strong',
    danger: 'bg-status-danger-subtle text-status-danger',
  }[tone]
  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-3', toneClass)}>
      <p className="text-sm">{children}</p>
      {action}
    </div>
  )
}

/** The card every supplier order surface hangs its content on. */
export function Panel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5', className)}>{children}</div>
  )
}

/** A label/value pair in a right-rail summary. */
export function SummaryRow({ label, value, valueClass }: { label: string; value: React.ReactNode; valueClass?: string }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className={cn('text-end font-semibold', valueClass ?? 'text-content-primary')}>{value}</dd>
    </div>
  )
}

/** Selectable reason chips — used by Decline, and shaped like the RFQ cancel flow's. */
export function ReasonChips({
  reasons,
  selected,
  onSelect,
  labelKey,
}: {
  reasons: string[]
  selected: string
  onSelect: (reason: string) => void
  labelKey: string
}) {
  const { t } = useTranslation()
  return (
    <div className="flex flex-wrap gap-2">
      {reasons.map((reason) => {
        const on = reason === selected
        return (
          <button
            key={reason}
            type="button"
            onClick={() => onSelect(reason)}
            className={cn(
              'mp-press cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              on
                ? 'border-brand-primary bg-brand-subtle text-brand-strong'
                : 'border-border-subtle text-content-secondary hover:text-content-primary',
            )}
          >
            {t(`${labelKey}.${reason}`)}
          </button>
        )
      })}
    </div>
  )
}
