import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useAppendOrderMessage, useOrder } from './hooks/orderQueries'
import { orderTotals } from './lib'
import { PurchaseOrderModal } from './PurchaseOrderModal'
import type { Order, OrderOffer } from './types'

const addMinutes = (iso: string, minutes: number) => new Date(new Date(iso).getTime() + minutes * 60_000).toISOString()

/**
 * OrderMessagesPage — the post-award "Order conversation": identities are revealed and the terms are
 * locked by the PO, so counters are closed and only free text moves.
 *
 * The pre-award offer history is still shown above the messages, because the whole point of the
 * screen is that you can see WHAT was agreed and argue about delivery without reopening price. Those
 * offer blocks stay ANONYMISED ("Supplier A") even though the supplier is now named: they record
 * what was said while the marketplace was still blind, and rewriting them with the real name would
 * retro-fit knowledge nobody had at the time.
 */
export function OrderMessagesPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const append = useAppendOrderMessage()
  const [draft, setDraft] = useState('')
  const [poOpen, setPoOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/buyer/orders" replace />

  const supplier = order.supplierShort
  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const stamp = (iso: string) => {
    const d = new Date(iso)
    const day = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(d)
    const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return `${day} · ${time}`
  }

  // A seeded dispatch exchange (shown when the order has shipped), then the buyer's own messages.
  const seeded = order.shipment.dispatchedAt
    ? [
        { by: 'supplier' as const, author: supplier, text: t('order.messages.seedDispatch', { ref: order.shipment.reference ?? '—' }), at: order.shipment.dispatchedAt },
        { by: 'buyer' as const, author: t('order.messages.you'), text: t('order.messages.seedAck'), at: addMinutes(order.shipment.dispatchedAt, 45) },
      ]
    : []
  const stored = (order.messages ?? []).map((m) => ({ by: m.by, author: m.by === 'buyer' ? t('order.messages.you') : supplier, text: m.text, at: m.at }))
  const messages = [...seeded, ...stored]

  const send = (body: string) => {
    const text = body.trim()
    if (!text) return
    append.mutate(
      { id: order.id, message: { by: 'buyer', text, at: new Date().toISOString() } },
      { onSuccess: () => setDraft('') },
    )
  }
  const onAttach = (file: File | null) => {
    if (file) send(t('order.messages.attached', { name: file.name }))
  }

  const deliveryDate = order.shipment.expectedArrival ?? order.shipment.deliveredAt
  // Items covered comes from the AGREED OFFER, not the PO's line count — a partial award covers
  // fewer lines than the RFQ asked for, which is exactly what "4 of 5" is telling the buyer.
  const covered = order.itemsCovered ?? order.lines.length
  const itemsTotal = order.itemsTotal ?? order.lines.length

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      {/* Breadcrumb — two crumbs, and the PO number is the reference both parties quote. */}
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/orders')} className="cursor-pointer hover:text-content-secondary">{t('order.title')}</button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{order.poNumber}</span>
      </nav>

      {/* Status chips + title */}
      <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-semibold">
        <span className="rounded-full bg-status-info-subtle px-2.5 py-1 text-status-info">{t('order.messages.inFulfilment')}</span>
        <span className="rounded-full bg-bg-surface-sunken px-2.5 py-1 text-content-secondary">
          {t('order.messages.termsLocked', { po: order.poNumber })}
        </span>
        <span className="rounded-full bg-status-success-subtle px-2.5 py-1 text-status-success-strong">
          {t('order.messages.identitiesRevealed')}
        </span>
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">{t('order.messages.heading')}</h1>
      <p className="mt-1 text-sm text-content-secondary">
        {order.title} · {order.poNumber} · {order.supplier.name}. {t('order.messages.locked')}
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Conversation */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.messages.conversation')}</h2>
            <span className="text-xs text-content-tertiary">{t('order.messages.historyMeta')}</span>
          </div>

          {/* Pre-award offer versions, oldest first — the audit trail the terms came from. */}
          {order.offerHistory && order.offerHistory.length > 0 && (
            <div className="mp-stagger mt-4 space-y-4">
              {order.offerHistory.map((offer) => (
                <OfferBlock key={offer.version} offer={offer} order={order} />
              ))}
            </div>
          )}

          <div className="mp-stagger mt-4 space-y-4">
            {messages.length === 0 && !order.offerHistory?.length ? (
              <p className="py-8 text-center text-sm text-content-tertiary">{t('order.messages.empty')}</p>
            ) : (
              messages.map((m, i) => (
                <div key={`${m.at}:${i}`} className="border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
                  <div className="flex items-center justify-between gap-3 text-sm">
                    <span className={cn('font-semibold', m.by === 'buyer' ? 'text-content-primary' : 'text-content-primary')}>{m.author}</span>
                    <span className="text-xs text-content-tertiary">{stamp(m.at)}</span>
                  </div>
                  <p className="mt-1 text-sm text-content-secondary">{m.text}</p>
                </div>
              ))
            )}
          </div>

          {/* Composer */}
          <div className="mt-5 space-y-3 border-t border-border-subtle pt-5">
            <Textarea rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} placeholder={t('order.messages.placeholder')} />
            <div className="flex flex-wrap items-center gap-2">
              <Button onClick={() => send(draft)} isLoading={append.isPending}>{t('order.messages.send')}</Button>
              <Button variant="outline" onClick={() => fileInput.current?.click()}>{t('order.messages.attach')}</Button>
              {/* The visible control is the button; the input only carries the file picker. */}
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                onChange={(e) => {
                  onAttach(e.target.files?.[0] ?? null)
                  e.target.value = ''
                }}
              />
            </div>
            <p className="text-xs text-content-tertiary">{t('order.messages.countersClosed')}</p>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {/* Agreed terms (locked) */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content-primary">{t('order.messages.agreedTerms')}</h2>
              <span className="rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
                {t('order.messages.lockedChip')}
              </span>
            </div>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('order.messages.orderTotal')} value={money(orderTotals(order).total)} valueClass="text-content-link" />
              <Row label={t('order.messages.fromOfferLabel')} value={`v${order.offerVersion}`} />
              <Row label={t('order.col.delivery')} value={dateFull(deliveryDate)} />
              <Row label={t('rfq.nego.paymentTerms')} value={order.paymentTermsLabel} />
              <Row label={t('rfq.nego.itemsCovered')} value={t('rfq.detail.itemsOf', { covered, total: itemsTotal })} />
            </dl>
          </div>

          {/* Documents */}
          <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <Button fullWidth onClick={() => setPoOpen(true)}>
              {t('order.messages.viewPo')}
            </Button>
            <Button fullWidth variant="outline" onClick={() => navigate(`/buyer/orders/${order.id}`)}>
              {t('order.messages.viewOrder')}
            </Button>
          </div>

          {/* Supplier — revealed, so this is the card that tells the buyer WHO to call. The CR/VAT
              and address live on the order itself; here the useful facts are a person and a number. */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.messages.supplier')}</h2>
            <p className="mt-2 text-base font-bold text-content-link">{order.supplier.name}</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('order.messages.contact')} value={order.supplier.contactName ?? '—'} />
              <Row label={t('order.messages.phone')} value={t('order.messages.phoneMasked')} />
            </dl>
          </div>
        </div>
      </div>

      <PurchaseOrderModal order={order} open={poOpen} onClose={() => setPoOpen(false)} />
    </section>
  )
}

/**
 * One pre-award offer version. The buyer's own counters are tinted with the brand wash so a glance
 * down the thread reads as an alternation between the two sides.
 */
function OfferBlock({ offer, order }: { offer: OrderOffer; order: Order }) {
  const { t, i18n } = useTranslation()
  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dayMonth = (iso: string) => new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso))
  const stamp = (iso: string) => {
    const d = new Date(iso)
    const day = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(d)
    const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return `${day} · ${time}`
  }
  const mine = offer.by === 'buyer'
  const author = mine ? t('order.messages.you') : order.supplierAnonLabel ?? order.supplierShort

  const stats = [
    { label: t('order.messages.offer.total'), value: money(offer.totalSar), strong: true },
    { label: t('order.messages.offer.delivery'), value: dayMonth(offer.deliveryDate) },
    { label: t('order.messages.offer.terms'), value: offer.paymentTermsLabel },
    { label: t('order.messages.offer.items'), value: t('rfq.detail.itemsOf', { covered: offer.itemsCovered, total: offer.itemsTotal }) },
  ]

  return (
    <div className="border-t border-border-subtle pt-4 first:border-t-0 first:pt-0">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-xs font-semibold text-content-secondary">v{offer.version}</span>
          <span className="font-semibold text-content-primary">{author}</span>
          {offer.tag && (
            <span
              className={cn(
                'rounded-full px-2 py-0.5 text-xs font-medium',
                mine ? 'bg-brand-subtle text-brand-primary' : 'bg-bg-surface-sunken text-content-secondary',
              )}
            >
              {t(`order.messages.offer.tag.${offer.tag}`)}
            </span>
          )}
        </div>
        <span className="text-xs text-content-tertiary">{stamp(offer.at)}</span>
      </div>

      <dl
        className={cn(
          'mt-2 grid gap-3 rounded-lg px-4 py-3 sm:grid-cols-4',
          mine ? 'bg-brand-subtle' : 'bg-bg-surface-sunken',
        )}
      >
        {stats.map((s) => (
          <div key={s.label}>
            <dt className="text-xs text-content-tertiary">{s.label}</dt>
            <dd className={cn('mt-0.5 text-sm font-semibold', s.strong ? 'text-content-link' : 'text-content-primary')}>{s.value}</dd>
          </div>
        ))}
      </dl>

      {offer.message && <p className="mt-2 text-sm text-content-secondary">{offer.message}</p>}
    </div>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className={valueClass ? `font-semibold ${valueClass}` : 'font-medium text-content-primary'}>{value}</dd>
    </div>
  )
}
