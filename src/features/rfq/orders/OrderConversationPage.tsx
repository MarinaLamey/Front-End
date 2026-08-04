import { useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useAppendOrderMessage, useRfq } from '../hooks/rfqQueries'
import { deriveRfqDetail, addDays, addMinutes } from '../detail/deriveRfqDetail'
import { orderNumber } from '../detail/award'
import { getThread } from '../negotiate/deriveNegotiation'
import type { OfferVersion, RfqAward } from '../types'

/** Short trading name from the full legal company name (first two words). */
const shortName = (company: string) => company.split(' ').slice(0, 2).join(' ')

interface DisplayMessage {
  by: 'supplier' | 'buyer'
  author: string
  text: string
  at: string
}

export function OrderConversationPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: rfq, isLoading } = useRfq(id)
  const append = useAppendOrderMessage()

  const [draft, setDraft] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq) return <Navigate to="/buyer/orders" replace />
  if (!rfq.award) return <Navigate to={`/buyer/rfqs/${id}`} replace />

  const a: RfqAward = rfq.award
  const detail = deriveRfqDetail(rfq)
  const bid = detail.bids.find((b) => b.id === a.bidId)
  const thread = bid ? getThread(rfq, detail, bid) : null
  const supplier = shortName(a.identity.companyName)

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateFull = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const stamp = (iso: string) => {
    const d = new Date(iso)
    const day = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(d)
    const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return `${day} · ${time}`
  }

  // Seeded dispatch exchange, always shown; the buyer's own messages append after it.
  const dispatchAt = addDays(a.deliveryDate, -5)
  const seeded: DisplayMessage[] = [
    { by: 'supplier', author: supplier, text: t('rfq.order.seed.dispatch'), at: dispatchAt },
    { by: 'buyer', author: t('rfq.nego.you'), text: t('rfq.order.seed.ack'), at: addMinutes(dispatchAt, 45) },
  ]
  const stored: DisplayMessage[] = (rfq.orderMessages ?? []).map((m) => ({
    by: m.by,
    author: m.by === 'buyer' ? t('rfq.nego.you') : supplier,
    text: m.text,
    at: m.at,
  }))
  const messages = [...seeded, ...stored]

  const send = (text: string) => {
    const body = text.trim()
    if (!body) return
    append.mutate(
      { id, message: { by: 'buyer', author: 'You', text: body, at: new Date().toISOString() } },
      { onSuccess: () => setDraft('') },
    )
  }
  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) send(t('rfq.order.attached', { name: file.name }))
    e.target.value = ''
  }

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      {/* Breadcrumb */}
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/orders')} className="cursor-pointer hover:text-content-secondary">
          {t('rfq.order.title')}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{orderNumber(rfq)}</span>
      </nav>

      {/* Chips + title */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="font-medium text-content-link">{t('rfq.order.inFulfilment')}</span>
        <span className="text-content-secondary">{t('rfq.order.termsLocked', { po: a.poNumber })}</span>
        <span className="rounded-full bg-status-success-subtle px-2 py-0.5 text-xs font-semibold text-status-success-strong">
          {t('rfq.order.identitiesRevealed')}
        </span>
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">{t('rfq.order.heading')}</h1>
      <p className="mt-1 text-sm text-content-secondary">
        {(rfq.title || t('rfq.list.untitled'))} · {orderNumber(rfq)} · {a.identity.companyName}. {t('rfq.order.lockedNote')}
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Conversation */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.order.conversation')}</h2>
            <span className="text-xs text-content-tertiary">{t('rfq.order.historyKept')}</span>
          </div>

          {/* Locked offer history */}
          {thread && (
            <ol className="mt-4 space-y-4">
              {thread.offers.map((offer) => (
                <li key={offer.version}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-xs font-semibold text-content-tertiary">
                      v{offer.version}
                    </span>
                    <span className="font-semibold text-content-primary">
                      {offer.by === 'supplier' ? thread.supplierLabel : t('rfq.nego.you')}
                    </span>
                    {offer.version === a.offerVersion && (
                      <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand-strong">
                        {t('rfq.nego.tag.latest')}
                      </span>
                    )}
                    <span className="ms-auto text-xs text-content-tertiary">{stamp(offer.at)}</span>
                  </div>
                  <OfferMetrics offer={offer} money={money} dateFull={dateFull} t={t} />
                </li>
              ))}
            </ol>
          )}

          {/* Free-text messages */}
          <div className="mt-4 space-y-4 border-t border-border-subtle pt-4">
            {messages.map((m, i) => (
              <div key={`${m.at}:${i}`}>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className={cn('font-semibold', m.by === 'buyer' ? 'text-content-primary' : 'text-content-link')}>
                    {m.author}
                  </span>
                  <span className="text-xs text-content-tertiary">{stamp(m.at)}</span>
                </div>
                <p className="mt-1 text-sm text-content-secondary">{m.text}</p>
              </div>
            ))}
          </div>

          {/* Composer */}
          <div className="mt-5 border-t border-border-subtle pt-5">
            <Textarea
              rows={3}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={t('rfq.order.composerPlaceholder')}
            />
            <div className="mt-3 flex gap-3">
              <Button onClick={() => send(draft)} isLoading={append.isPending}>
                {t('rfq.order.sendMessage')}
              </Button>
              <Button variant="outline" onClick={() => fileRef.current?.click()}>
                {t('rfq.order.attachFile')}
              </Button>
              <input ref={fileRef} type="file" className="hidden" onChange={onPickFile} />
            </div>
            <p className="mt-3 text-xs text-content-tertiary">{t('rfq.order.countersClosed')}</p>
          </div>
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {/* Agreed terms */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content-primary">{t('rfq.order.agreedTerms')}</h2>
              <span className="rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
                {t('rfq.order.locked')}
              </span>
            </div>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('rfq.order.orderTotal')} value={money(a.agreedTotalSar)} valueClass="text-content-link" />
              <Row label={t('rfq.order.fromOffer')} value={`v${a.offerVersion}`} />
              <Row label={t('rfq.nego.cols.delivery')} value={dateFull(a.deliveryDate)} />
              <Row label={t('rfq.nego.paymentTerms')} value={a.paymentTermsLabel} />
              <Row label={t('rfq.nego.itemsCovered')} value={t('rfq.detail.itemsOf', { covered: a.itemsCovered, total: a.itemsTotal })} />
            </dl>
          </div>

          {/* Documents */}
          <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface p-5">
            <Button fullWidth onClick={() => navigate(`/buyer/rfqs/${id}/award`)}>
              {t('rfq.order.viewPo')}
            </Button>
            <Button fullWidth variant="outline" onClick={() => navigate(`/buyer/rfqs/${id}`)}>
              {t('rfq.order.viewOrder')}
            </Button>
          </div>

          {/* Supplier (revealed) */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.order.supplier')}</h2>
            <p className="mt-2 text-base font-bold text-content-link">{a.identity.companyName}</p>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('rfq.order.contact')} value={a.identity.contactName} />
              <Row label={t('rfq.order.phone')} value={t('rfq.order.phoneMasked')} />
            </dl>
          </div>
        </div>
      </div>
    </section>
  )
}

function OfferMetrics({
  offer,
  money,
  dateFull,
  t,
}: {
  offer: OfferVersion
  money: (n: number) => string
  dateFull: (iso: string) => string
  t: (key: string, opts?: Record<string, unknown>) => string
}) {
  return (
    <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg bg-bg-surface-sunken px-4 py-3 sm:grid-cols-4">
      <Metric label={t('rfq.nego.cols.total')} value={money(offer.totalSar)} strong />
      <Metric label={t('rfq.nego.cols.delivery')} value={dateFull(offer.deliveryDate)} />
      <Metric label={t('rfq.nego.cols.terms')} value={offer.paymentTermsLabel} />
      <Metric label={t('rfq.nego.cols.items')} value={t('rfq.detail.itemsOf', { covered: offer.itemsCovered, total: offer.itemsTotal })} />
    </div>
  )
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-content-tertiary">{label}</p>
      <p className={strong ? 'text-sm font-bold text-content-link' : 'text-sm font-medium text-content-primary'}>{value}</p>
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
