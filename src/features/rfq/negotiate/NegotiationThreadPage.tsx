import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useAwardRfq, useRfq, useSaveNegotiation } from '../hooks/rfqQueries'
import { deriveRfqDetail } from '../detail/deriveRfqDetail'
import { buildAwardFromThread } from '../detail/award'
import type { OfferVersion } from '../types'
import {
  applyBuyerCounter,
  awaitingSupplier,
  getThread,
  lastBuyerOffer,
  onTable,
  otherThreads,
} from './deriveNegotiation'
import { EndNegotiationDialog } from './EndNegotiationDialog'

const inputClass =
  'w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors focus:border-brand-primary'

export function NegotiationThreadPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { rfqId = '', bidId = '' } = useParams()
  const { data: rfq, isLoading } = useRfq(rfqId)
  const award = useAwardRfq()
  const saveNego = useSaveNegotiation()

  const detail = useMemo(() => (rfq ? deriveRfqDetail(rfq) : null), [rfq])
  const bid = detail?.bids.find((b) => b.id === bidId) ?? null
  const thread = rfq && detail && bid ? getThread(rfq, detail, bid) : null

  const [endOpen, setEndOpen] = useState(false)
  const [message, setMessage] = useState('')
  const table = thread ? onTable(thread) : null
  const [counter, setCounter] = useState<{ total: string; delivery: string; terms: string } | null>(null)
  const formRef = useRef<HTMLDivElement>(null)
  const totalRef = useRef<HTMLInputElement>(null)

  if (isLoading || !detail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq || !bid || !thread || !table) return <Navigate to="/buyer/negotiations" replace />
  if (rfq.status === 'awarded') return <Navigate to={`/buyer/rfqs/${rfqId}/award`} replace />

  // Lazily seed the counter form from what's on the table (a touch below, same date/terms).
  const form = counter ?? {
    total: String(Math.round((table.totalSar * 0.985) / 10) * 10),
    delivery: table.deliveryDate.slice(0, 10),
    terms: table.paymentTermsLabel,
  }
  const setForm = (patch: Partial<typeof form>) => setCounter({ ...form, ...patch })

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateFull = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const stamp = (iso: string) => {
    const d = new Date(iso)
    const day = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(d)
    const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return `${day} · ${time}`
  }
  const daysUntil = (iso: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0)

  const original = thread.offers[0]
  const yourCounter = lastBuyerOffer(thread)
  const round = thread.offers[thread.offers.length - 1].version
  const expiresIn = daysUntil(thread.validUntil)
  const active = thread.status === 'active'

  const resolveMsg = (offer: OfferVersion): string => {
    if (offer.message) return offer.message
    if (!offer.messageKey) return ''
    const p: Record<string, string | number> = { ...offer.messageParams }
    if (typeof p.amount === 'number') p.amount = money(p.amount)
    if (typeof p.best === 'number') p.best = money(p.best)
    return t(offer.messageKey, p)
  }
  const offerTag = (offer: OfferVersion): string | null => {
    if (offer.by === 'buyer') return t('rfq.nego.tag.yourCounter')
    if (offer.version === 1) return t('rfq.nego.tag.originalBid')
    if (offer.version === table.version) return t('rfq.nego.tag.latest')
    return null
  }

  const delta = (value: number) => {
    const sign = value > 0 ? '+' : value < 0 ? '−' : ''
    const cls = value > 0 ? 'text-status-warning-strong' : value < 0 ? 'text-status-success-strong' : 'text-content-secondary'
    return { text: `${sign} ${money(Math.abs(value))}`.trim(), cls }
  }
  const vsCounter = yourCounter ? delta(table.totalSar - yourCounter.totalSar) : null
  const vsOriginal = delta(table.totalSar - original.totalSar)

  const focusCounter = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setTimeout(() => totalRef.current?.focus(), 250)
  }

  const sendCounter = () => {
    const totalSar = Number(form.total)
    if (!Number.isFinite(totalSar) || totalSar <= 0) return
    const next = applyBuyerCounter(thread, {
      totalSar,
      deliveryDate: form.delivery ? new Date(form.delivery).toISOString() : table.deliveryDate,
      paymentTermsLabel: form.terms.trim() || table.paymentTermsLabel,
      message,
    })
    saveNego.mutate(
      { id: rfqId, thread: next },
      {
        onSuccess: () => {
          setMessage('')
          setCounter(null)
        },
      },
    )
  }

  const acceptAndAward = () =>
    award.mutate(
      { id: rfqId, award: buildAwardFromThread(rfq, detail, bid, thread, table) },
      { onSuccess: () => navigate(`/buyer/rfqs/${rfqId}/award`) },
    )

  const confirmEnd = () =>
    saveNego.mutate(
      { id: rfqId, thread: { ...thread, status: 'ended' } },
      { onSuccess: () => navigate('/buyer/negotiations') },
    )

  const reopen = () => saveNego.mutate({ id: rfqId, thread: { ...thread, status: 'active' } })

  const others = otherThreads(rfq, detail, bid.id).slice(0, 3)
  const otherLabels = others.map((th) => th.supplierLabel)
  const othersText =
    otherLabels.length === 0
      ? ''
      : otherLabels.length === 1
        ? otherLabels[0]
        : `${otherLabels.slice(0, -1).join('، ')} ${t('rfq.nego.and')} ${otherLabels[otherLabels.length - 1]}`

  const otherStatus = (th: typeof thread) => {
    if (th.offers.length === 1) return t('rfq.nego.also.notYet')
    if (awaitingSupplier(th)) return t('rfq.nego.also.awaiting')
    return t('rfq.nego.also.yourTurn')
  }

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      {/* Breadcrumb */}
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/negotiations')} className="cursor-pointer hover:text-content-secondary">
          {t('rfq.nego.title')}
        </button>
        <span className="mx-1.5">/</span>
        <button type="button" onClick={() => navigate(`/buyer/rfqs/${rfqId}`)} className="cursor-pointer hover:text-content-secondary">
          {rfq.reference}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{thread.supplierLabel}</span>
      </nav>

      {/* Chips + title */}
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
          {t('rfq.nego.round', { n: round })}
        </span>
        <span className="font-medium text-content-link">{t('rfq.nego.identityHidden')}</span>
        {active && expiresIn > 0 && (
          <span className="font-medium text-status-warning-strong">{t('rfq.nego.expiresIn', { count: expiresIn })}</span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">
        {t('rfq.nego.heading', { supplier: thread.supplierLabel })}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {(rfq.title || t('rfq.list.untitled'))} · {rfq.reference} · {t('rfq.nego.everyOfferNote')}
      </p>

      {!active && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-surface-sunken px-4 py-3">
          <p className="text-sm text-content-secondary">{t('rfq.nego.closedNote')}</p>
          {rfq.status === 'open' && (
            <Button size="sm" variant="outline" onClick={reopen} isLoading={saveNego.isPending}>
              {t('rfq.nego.reopen')}
            </Button>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Offer history */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.nego.history')}</h2>
            <span className="text-xs text-content-tertiary">
              {t('rfq.nego.offersKept', { count: thread.offers.length })}
            </span>
          </div>

          <ol className="mt-4 space-y-5">
            {thread.offers.map((offer) => {
              const tag = offerTag(offer)
              return (
                <li key={offer.version}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-xs font-semibold text-content-tertiary">
                      v{offer.version}
                    </span>
                    <span className="font-semibold text-content-primary">
                      {offer.by === 'supplier' ? thread.supplierLabel : t('rfq.nego.you')}
                    </span>
                    {tag && (
                      <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand-strong">{tag}</span>
                    )}
                    <span className="ms-auto text-xs text-content-tertiary">{stamp(offer.at)}</span>
                  </div>

                  <div
                    className={cn(
                      'mt-2 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg px-4 py-3 sm:grid-cols-4',
                      offer.by === 'buyer' ? 'bg-brand-subtle/40' : 'bg-bg-surface-sunken',
                    )}
                  >
                    <Metric label={t('rfq.nego.cols.total')} value={money(offer.totalSar)} strong />
                    <Metric label={t('rfq.nego.cols.delivery')} value={dateFull(offer.deliveryDate)} />
                    <Metric label={t('rfq.nego.cols.terms')} value={offer.paymentTermsLabel} />
                    <Metric label={t('rfq.nego.cols.items')} value={t('rfq.detail.itemsOf', { covered: offer.itemsCovered, total: offer.itemsTotal })} />
                  </div>

                  {resolveMsg(offer) && <p className="mt-2 text-sm text-content-secondary">{resolveMsg(offer)}</p>}
                </li>
              )
            })}
          </ol>

          {active && (
            <div ref={formRef} className="mt-6 border-t border-border-subtle pt-5">
              <p className="text-sm font-semibold text-content-primary">{t('rfq.nego.sendCounter')}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">{t('rfq.nego.form.total')}</span>
                  <input
                    ref={totalRef}
                    type="number"
                    inputMode="numeric"
                    value={form.total}
                    onChange={(e) => setForm({ total: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">{t('rfq.nego.form.delivery')}</span>
                  <input
                    type="date"
                    value={form.delivery}
                    onChange={(e) => setForm({ delivery: e.target.value })}
                    className={inputClass}
                  />
                </label>
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">{t('rfq.nego.form.terms')}</span>
                  <input
                    type="text"
                    value={form.terms}
                    onChange={(e) => setForm({ terms: e.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>
              <Textarea
                rows={2}
                className="mt-3"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('rfq.nego.form.messagePlaceholder')}
              />
              <Button className="mt-3" onClick={sendCounter} isLoading={saveNego.isPending}>
                {t('rfq.nego.sendCounter')}
              </Button>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="space-y-5">
          {/* On the table */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content-primary">{t('rfq.nego.onTable')}</h2>
              <span className="rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
                {t('rfq.nego.offerV', { n: table.version })}
              </span>
            </div>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('rfq.nego.bidTotal')} value={money(table.totalSar)} valueClass="text-content-link" />
              {vsCounter && <Row label={t('rfq.nego.vsYourCounter')} value={vsCounter.text} valueClass={vsCounter.cls} />}
              <Row label={t('rfq.nego.vsOriginal')} value={vsOriginal.text} valueClass={vsOriginal.cls} />
              <Row label={t('rfq.nego.cols.delivery')} value={dateFull(table.deliveryDate)} />
              <Row label={t('rfq.nego.paymentTerms')} value={table.paymentTermsLabel} />
              <Row label={t('rfq.nego.itemsCovered')} value={t('rfq.detail.itemsOf', { covered: table.itemsCovered, total: table.itemsTotal })} />
            </dl>
            <p className="mt-4 text-xs text-content-tertiary">
              {t('rfq.nego.tableNote', { supplier: thread.supplierLabel, version: table.version })}
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface p-5">
            <Button fullWidth onClick={acceptAndAward} isLoading={award.isPending} disabled={!active}>
              {t('rfq.nego.acceptAward')}
            </Button>
            <Button fullWidth variant="outline" onClick={focusCounter} disabled={!active}>
              {t('rfq.nego.sendCounter')}
            </Button>
            <Button
              fullWidth
              variant="ghost"
              className="text-status-danger hover:bg-status-danger-subtle"
              onClick={() => setEndOpen(true)}
              disabled={!active}
            >
              {t('rfq.nego.endNegotiation')}
            </Button>
          </div>

          {/* Also negotiating */}
          {others.length > 0 && (
            <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
              <h2 className="text-sm font-semibold text-content-primary">{t('rfq.nego.alsoNegotiating')}</h2>
              <ul className="mt-3 space-y-3">
                {others.map((th) => {
                  const ot = onTable(th)
                  return (
                    <li key={th.bidId}>
                      <button
                        type="button"
                        onClick={() => navigate(`/buyer/negotiations/${rfqId}/${th.bidId}`)}
                        className="flex w-full items-center justify-between gap-3 text-start"
                      >
                        <span>
                          <span className="block text-sm font-medium text-content-primary">{th.supplierLabel}</span>
                          <span className="block text-xs text-content-tertiary">{otherStatus(th)}</span>
                        </span>
                        <span className="text-sm font-medium text-content-secondary">
                          {money(ot.totalSar)} · v{ot.version}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-3 text-xs text-content-tertiary">{t('rfq.nego.alsoNote')}</p>
            </div>
          )}
        </div>
      </div>

      <EndNegotiationDialog
        open={endOpen}
        supplierLabel={thread.supplierLabel}
        roundLabel={t('rfq.nego.round', { n: round })}
        offerVersion={table.version}
        offerAmount={money(table.totalSar)}
        others={othersText}
        onClose={() => setEndOpen(false)}
        onConfirm={confirmEnd}
        loading={saveNego.isPending}
      />
    </section>
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
