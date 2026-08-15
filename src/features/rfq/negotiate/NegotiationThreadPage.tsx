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
import { priceTotals } from '../vat'
import type { OfferVersion } from '../types'
import type { Milestone, PaymentPreset } from '../create/paymentRules'
import { findContactDetails } from '../messageGuard'
import {
  applyBuyerCounter,
  awaitingSupplier,
  effectiveExpiry,
  getThread,
  lastBuyerOffer,
  onTable,
  otherThreads,
  splitProRata,
  type CounterLineInput,
} from './deriveNegotiation'
import { EndNegotiationDialog } from './EndNegotiationDialog'
import { PaymentTermsDialog } from './PaymentTermsDialog'

/** The counter table's tracks, shared by its header and its rows so the columns can't drift. */
const LINE_GRID = 'grid grid-cols-[20px_minmax(0,1.6fr)_86px_104px_104px_130px] items-center gap-3'

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
  const [termsOpen, setTermsOpen] = useState(false)
  const [message, setMessage] = useState('')
  const table = thread ? onTable(thread) : null
  const [counterForm, setCounterForm] = useState<{
    lines: CounterLineInput[]
    terms: string
    preset: PaymentPreset
    milestones: Milestone[]
  } | null>(null)
  /** Held as raw text while typing so a half-entered number isn't reformatted under the cursor. */
  const [targetInput, setTargetInput] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const formRef = useRef<HTMLDivElement>(null)
  // One clock reading per mount, so the expiry chip and the rail agree with each other.
  const [now] = useState(() => Date.now())

  if (isLoading || !detail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq || !bid || !thread || !table) return <Navigate to="/buyer/negotiations" replace />
  if (rfq.status === 'awarded') return <Navigate to={`/buyer/rfqs/${rfqId}/award`} replace />

  // Lazily seed the counter form from what's on the table — each line a touch below, same dates/terms.
  const tableLines = table.lines ?? []
  const form = counterForm ?? {
    lines: tableLines.map((l) => ({
      index: l.index,
      unitPriceSar: Math.round(l.unitPriceSar * 0.985 * 100) / 100,
      quantity: l.quantity,
      included: l.included,
      deliveryDate: (l.deliveryDate ?? table.deliveryDate).slice(0, 10),
    })),
    terms: table.paymentTermsLabel,
    preset: table.paymentPreset ?? rfq.paymentPreset,
    milestones: table.paymentMilestones ?? rfq.milestones,
  }
  const setLine = (index: number, patch: Partial<CounterLineInput>) => {
    // Editing a line by hand re-syncs the target field to whatever the lines now come to, so the
    // two readings of the same number can never disagree.
    setTargetInput(null)
    setCounterForm({ ...form, lines: form.lines.map((l) => (l.index === index ? { ...l, ...patch } : l)) })
  }
  // Quoted lines only: the frame lists what the counter covers, and an un-supplied line has nothing
  // to price. `included` still travels with the counter so the offer keeps its "n of m" reading.
  const quotedLines = form.lines.filter((l) => l.included)
  const counterTotal = form.lines.reduce((sum, l) => sum + (l.included ? l.unitPriceSar * l.quantity : 0), 0)
  // Lines are VAT-inclusive, so their sum IS the headline the counter is quoted at.
  const counterHeadline = counterTotal

  // The target total is a pro-rata shortcut over the same lines — type the number to land on and the
  // per-line prices follow, because the purchase order needs real line prices.
  const targetValue = targetInput ?? (counterHeadline ? counterHeadline.toFixed(2) : '')
  const onTargetChange = (raw: string) => {
    setTargetInput(raw)
    const value = Number(raw)
    if (value > 0) setCounterForm({ ...form, lines: splitProRata(form.lines, value) })
  }
  // The lines must reconcile to the target, and the offer cannot be sent while they disagree.
  // Splitting pro-rata rounds each line to the halala, so a typed target can end up a few halalas
  // away from what the lines actually come to — the form says so plainly rather than quietly
  // sending a different number than the buyer typed.
  const typedTarget = targetInput !== null ? Number(targetInput) : null
  const targetGap =
    typedTarget !== null && typedTarget > 0 ? Math.round((counterHeadline - typedTarget) * 100) / 100 : 0
  const linesReconcile = Math.abs(targetGap) < 0.01

  // A counter message may not carry contact details or a company name — this is a blind marketplace,
  // and the free-text box is the one place either side could hand an identity over.
  const messageViolations = findContactDetails(message)
  const messageBlocked = messageViolations.length > 0
  const canSend = counterTotal > 0 && linesReconcile && !messageBlocked

  const applyTerms = (preset: PaymentPreset, milestones: Milestone[]) => {
    setCounterForm({
      ...form,
      preset,
      milestones,
      // The label is always the percentages, derived here so it can't drift from the schedule.
      terms: milestones.map((m) => m.percent).join(' / '),
    })
    setTermsOpen(false)
  }

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  /** A line total: quantity × unit price to two decimals, printed bare — the column is already SAR. */
  const lineMoney = (n: number) =>
    new Intl.NumberFormat(i18n.language, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Math.round(n * 100) / 100,
    )
  const dateFull = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  /** Day + month only — the offer strip is a glance, and the year is the same on every row. */
  const dateShort = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(new Date(iso)) : '—'
  const stamp = (iso: string) => {
    const d = new Date(iso)
    const day = new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short' }).format(d)
    const time = new Intl.DateTimeFormat(i18n.language, { hour: '2-digit', minute: '2-digit', hour12: false }).format(d)
    return `${day} · ${time}`
  }
  const daysUntil = (iso: string) => (iso ? Math.ceil((new Date(iso).getTime() - now) / 86_400_000) : 0)

  const original = thread.offers[0]
  const yourCounter = lastBuyerOffer(thread)
  const round = thread.offers[thread.offers.length - 1].version
  // The countdown runs to the LATEST bid-validity date across the versions, and the chip names that
  // date — both sides must be able to read the same instant, not just the same number of days.
  const expiryDate = effectiveExpiry(thread)
  const expiresIn = daysUntil(expiryDate)
  // `agreed` = the supplier accepted and is waiting on the buyer to award. The conversation stays
  // open either way: countering again simply withdraws their acceptance (spec v1.1 change #3).
  const agreed = thread.status === 'agreed'
  const active = thread.status === 'active' || agreed

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
  }

  const sendCounter = () => {
    if (!canSend) return
    const next = applyBuyerCounter(thread, {
      lines: form.lines.map((l) => ({
        ...l,
        deliveryDate: l.deliveryDate ? new Date(l.deliveryDate).toISOString() : undefined,
      })),
      deliveryDate: table.deliveryDate,
      paymentTermsLabel: form.terms.trim() || table.paymentTermsLabel,
      paymentPreset: form.preset,
      paymentMilestones: form.milestones,
      message,
    })
    saveNego.mutate(
      { id: rfqId, thread: next },
      {
        onSuccess: () => {
          setMessage('')
          setCounterForm(null)
          setTargetInput(null)
        },
      },
    )
  }

  const acceptAndAward = () =>
    award.mutate(
      { id: rfqId, awards: [buildAwardFromThread(rfq, detail, bid, thread, table)] },
      { onSuccess: () => navigate(`/buyer/rfqs/${rfqId}/award`) },
    )

  const confirmEnd = () =>
    saveNego.mutate(
      { id: rfqId, thread: { ...thread, status: 'ended' } },
      { onSuccess: () => navigate('/buyer/negotiations') },
    )

  const reopen = () => saveNego.mutate({ id: rfqId, thread: { ...thread, status: 'active' } })

  const others = otherThreads(rfq, detail, bid.id).slice(0, 3)
  // "Supplier B and Supplier C" — the list formatter owns the separator and the conjunction, so
  // Arabic gets its own comma and و rather than an English join with an Arabic comma in it.
  const otherLabels = others.map((th) => th.supplierLabel)
  const othersText = otherLabels.length
    ? new Intl.ListFormat(i18n.language, { type: 'conjunction' }).format(otherLabels)
    : ''

  const otherStatus = (th: typeof thread) => {
    if (th.offers.length === 1) return t('rfq.nego.also.notYet')
    if (awaitingSupplier(th)) return t('rfq.nego.also.awaiting')
    return t('rfq.nego.also.yourTurn')
  }

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      {/* Breadcrumb */}
      <nav className="text-sm text-content-tertiary">
        <button
          type="button"
          onClick={() => navigate('/buyer/negotiations')}
          className="cursor-pointer text-content-link hover:text-content-link-hover"
        >
          {t('rfq.nego.title')}
        </button>
        <span className="mx-1.5">/</span>
        <button
          type="button"
          onClick={() => navigate(`/buyer/rfqs/${rfqId}`)}
          className="cursor-pointer text-content-link hover:text-content-link-hover"
        >
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
        <span className="rounded-full bg-status-info-subtle px-2 py-0.5 text-xs font-semibold text-status-info">
          {t('rfq.nego.identityHidden')}
        </span>
        {active && expiresIn > 0 && (
          <span className="rounded-full bg-status-warning-subtle px-2 py-0.5 text-xs font-semibold text-status-warning-strong">
            {t('rfq.nego.expiresIn', { count: expiresIn, date: dateFull(expiryDate) })}
          </span>
        )}
      </div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">
        {t('rfq.nego.heading', { supplier: thread.supplierLabel })}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {(rfq.title || t('rfq.list.untitled'))} · {rfq.reference} · {t('rfq.nego.everyOfferNote')}
      </p>

      {agreed && (
        <p className="mt-4 rounded-lg bg-status-warning-subtle px-4 py-3 text-sm text-status-warning-strong">
          {t('rfq.nego.acceptedNote', { supplier: thread.supplierLabel })}
        </p>
      )}

      {!active && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-lg bg-bg-surface-sunken px-4 py-3">
          <p className="text-sm text-content-secondary">{t('rfq.nego.closedNote')}</p>
          {rfq.status === 'live' && (
            <Button size="sm" variant="outline" onClick={reopen} isLoading={saveNego.isPending}>
              {t('rfq.nego.reopen')}
            </Button>
          )}
        </div>
      )}

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
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
              const showDetail = expanded[offer.version] ?? false
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
                    <Metric label={t('rfq.nego.cols.delivery')} value={dateShort(offer.deliveryDate)} />
                    <Metric label={t('rfq.nego.cols.terms')} value={offer.paymentTermsLabel} />
                    <Metric label={t('rfq.nego.cols.items')} value={t('rfq.detail.itemsOf', { covered: offer.itemsCovered, total: offer.itemsTotal })} />
                  </div>

                  {resolveMsg(offer) && <p className="mt-2 text-sm text-content-secondary">{resolveMsg(offer)}</p>}

                  {/* The lines behind the headline — collapsed by default so the history stays scannable. */}
                  {(offer.lines?.length ?? 0) > 0 && (
                    <>
                      <button
                        type="button"
                        aria-expanded={showDetail}
                        onClick={() => setExpanded((prev) => ({ ...prev, [offer.version]: !showDetail }))}
                        className="mp-press mt-1.5 inline-flex cursor-pointer items-center gap-1 text-xs font-medium text-content-link hover:underline"
                      >
                        <CaretIcon
                          className={cn(
                            'h-3 w-3 transition-transform motion-reduce:transition-none rtl:-scale-x-100',
                            showDetail && 'rotate-90',
                          )}
                        />
                        {showDetail ? t('rfq.nego.hideDetails') : t('rfq.nego.viewDetails')}
                      </button>

                      {showDetail && (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full min-w-[520px] text-sm">
                            <thead>
                              <tr className="border-b border-border-subtle text-xs font-medium text-content-tertiary">
                                <th className="w-8 py-1.5 text-start font-medium">#</th>
                                <th className="py-1.5 text-start font-medium">{t('rfq.nego.form.description')}</th>
                                <th className="w-20 py-1.5 text-start font-medium">{t('rfq.nego.form.qty')}</th>
                                <th className="w-28 py-1.5 text-start font-medium">{t('rfq.nego.form.unitPrice')}</th>
                                <th className="w-28 py-1.5 text-end font-medium">{t('rfq.nego.form.lineTotal')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                              {(offer.lines ?? [])
                                .filter((line) => line.included)
                                .map((line) => (
                                  <tr key={line.index}>
                                    <td className="py-1.5 text-content-tertiary">{line.index + 1}</td>
                                    <td className="py-1.5 text-content-primary">{line.name}</td>
                                    <td className="py-1.5 text-content-secondary">{line.quantity.toLocaleString()}</td>
                                    <td className="py-1.5 text-content-secondary">{line.unitPriceSar.toFixed(2)}</td>
                                    <td className="py-1.5 text-end font-medium text-content-primary">
                                      {lineMoney(line.unitPriceSar * line.quantity)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ol>

          {active && (
            <div ref={formRef} className="mt-6 border-t border-border-subtle pt-5">
              <p className="text-sm font-semibold text-content-primary">
                {agreed ? t('rfq.nego.counterWithdrawsAcceptance') : t('rfq.nego.sendCounter')}
              </p>

              {/* Target total drives the lines pro-rata; the schedule is edited in its own modal. */}
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">
                    {t('rfq.nego.form.total')}
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    value={targetValue}
                    onChange={(e) => onTargetChange(e.target.value)}
                    className={inputClass}
                  />
                </label>
                <div className="block">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-content-secondary">{t('rfq.nego.form.terms')}</span>
                    <button
                      type="button"
                      onClick={() => setTermsOpen(true)}
                      className="mp-press cursor-pointer text-xs font-semibold text-content-link hover:underline"
                    >
                      {t('rfq.nego.form.edit')}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTermsOpen(true)}
                    className={cn(inputClass, 'cursor-pointer text-start')}
                  >
                    {form.terms}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-content-primary">
                  {t('rfq.nego.form.mapsToLines', { count: quotedLines.length })}
                </p>
                <span className="text-xs text-content-tertiary">{t('rfq.nego.form.proRataHint')}</span>
              </div>

              {/* Line-by-line counter — per-line price, quantity and delivery date. */}
              <div className="mt-2 overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className={cn(LINE_GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
                    <span>#</span>
                    <span>{t('rfq.nego.form.description')}</span>
                    <span>{t('rfq.nego.form.qty')}</span>
                    <span>{t('rfq.nego.form.unitPrice')}</span>
                    <span>{t('rfq.nego.form.lineTotal')}</span>
                    <span>{t('rfq.nego.form.delivery')}</span>
                  </div>
                  <ul className="divide-y divide-border-subtle">
                    {quotedLines.map((line) => {
                      const meta = tableLines.find((tl) => tl.index === line.index)
                      return (
                        <li key={line.index} className={cn(LINE_GRID, 'py-2.5')}>
                          <span className="text-sm text-content-tertiary">{line.index + 1}</span>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-content-primary">
                              {meta?.name ?? `#${line.index + 1}`}
                            </span>
                            {meta?.unit && <span className="block text-xs text-content-tertiary">{meta.unit}</span>}
                          </span>
                          <input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            value={line.quantity || ''}
                            onChange={(e) => setLine(line.index, { quantity: Number(e.target.value) || 0 })}
                            className={inputClass}
                            aria-label={t('rfq.nego.form.qty')}
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={line.unitPriceSar || ''}
                            onChange={(e) => setLine(line.index, { unitPriceSar: Number(e.target.value) || 0 })}
                            className={inputClass}
                            aria-label={t('rfq.nego.form.unitPrice')}
                          />
                          <span className="text-sm font-medium text-content-primary">
                            {lineMoney(line.unitPriceSar * line.quantity)}
                          </span>
                          <input
                            type="date"
                            value={line.deliveryDate ?? ''}
                            onChange={(e) => setLine(line.index, { deliveryDate: e.target.value })}
                            className={inputClass}
                            aria-label={t('rfq.nego.form.delivery')}
                          />
                        </li>
                      )
                    })}
                  </ul>
                  {/* Lines are VAT-inclusive; the subtotal is divided back out for the footer. */}
                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
                    <span className="text-xs text-content-tertiary">
                      {t('rfq.nego.form.subtotal')} {money(priceTotals(counterTotal).subtotal)} ·{' '}
                      {t('rfq.supplier.vatLine')} {money(priceTotals(counterTotal).vat)}
                    </span>
                    <span
                      className={cn(
                        'text-sm font-semibold',
                        linesReconcile ? 'text-status-success-strong' : 'text-status-danger',
                      )}
                    >
                      {linesReconcile
                        ? t('rfq.nego.form.linesTotal', { amount: money(counterHeadline) })
                        : t(targetGap > 0 ? 'rfq.nego.form.linesOver' : 'rfq.nego.form.linesUnder', {
                            amount: money(counterHeadline),
                            delta: money(Math.abs(targetGap)),
                          })}
                    </span>
                  </div>
                </div>
              </div>

              <Textarea
                rows={2}
                className="mt-3"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('rfq.nego.form.messagePlaceholder')}
                aria-invalid={messageBlocked}
              />
              {messageBlocked && (
                <p className="mt-1.5 text-xs font-medium text-status-danger">
                  {t('rfq.nego.form.noContact', {
                    kind: t(`rfq.nego.form.contactKind.${messageViolations[0]}`),
                  })}
                </p>
              )}
              <p className="mt-2 text-xs text-content-tertiary">{t('rfq.nego.form.acceptNote')}</p>
              <Button className="mt-3" onClick={sendCounter} isLoading={saveNego.isPending} disabled={!canSend}>
                {t('rfq.nego.form.send')}
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
              {t('rfq.nego.form.send')}
            </Button>
            <Button
              fullWidth
              variant="outline"
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

      <PaymentTermsDialog
        open={termsOpen}
        total={counterHeadline}
        preset={form.preset}
        milestones={form.milestones}
        onClose={() => setTermsOpen(false)}
        onApply={applyTerms}
      />

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

/** The disclosure caret before "View details" — points right when collapsed, down when open. */
function CaretIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 12 12" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M4 2.5 8.5 6 4 9.5z" />
    </svg>
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
