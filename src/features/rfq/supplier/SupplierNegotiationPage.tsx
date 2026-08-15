import { useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { cn } from '@/shared/lib/cn'
import { useRfq, useSaveNegotiation, useSaveSupplierBid } from '../hooks/rfqQueries'
import { categoryLabel, type OfferVersion } from '../types'
import {
  acceptLatestOffer,
  agreedOffer,
  applySupplierCounter,
  lastOfferFrom,

  offerTotal,
  splitProRata,
  type CounterLineInput,
} from '../negotiate/deriveNegotiation'
import { priceTotals } from '../vat'
import type { Milestone, PaymentPreset } from '../create/paymentRules'
import { PaymentTermsDialog } from '../negotiate/PaymentTermsDialog'
import { toSupplierView } from './deriveSupplierBid'
import { bidRecordFrom } from './bidRecord'
import { Panel, SummaryRow } from './components'
import { useSupplierFormat } from './format'
import { WithdrawBidDialog } from './WithdrawBidDialog'

/** The revise table's tracks, shared by its header and rows so the columns can't drift. */
const LINE_GRID = 'grid grid-cols-[20px_minmax(0,1.5fr)_86px_104px_104px_130px] items-center gap-3'

const inputClass =
  'w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50'

/**
 * SupplierNegotiationPage — the supplier's end of the offer thread.
 *
 * Every version both sides sent is kept and visible; nothing already sent can be edited. The
 * supplier can accept the buyer's latest offer, revise their own, or withdraw. Accepting does NOT
 * create an order — the terms become Agreed and the buyer issues the purchase order (spec v1.1 #3),
 * and revising afterwards withdraws that acceptance.
 */
export function SupplierNegotiationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { rfqId = '' } = useParams()
  const { data: rfq, isLoading } = useRfq(rfqId)
  const saveNego = useSaveNegotiation()
  const saveBid = useSaveSupplierBid()
  const { money, dateFull, stamp, dateValue } = useSupplierFormat()

  const [message, setMessage] = useState('')
  const [expanded, setExpanded] = useState<Record<number, boolean>>({})
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  const [termsOpen, setTermsOpen] = useState(false)
  const [targetInput, setTargetInput] = useState<string | null>(null)
  const reviseRef = useRef<HTMLDivElement>(null)
  const [form, setForm] = useState<{
    lines: CounterLineInput[]
    delivery: string
    terms: string
    preset: PaymentPreset
    milestones: Milestone[]
    validUntil: string
  } | null>(null)

  const view = useMemo(() => (rfq ? toSupplierView(rfq) : null), [rfq])

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq || !view) return <Navigate to="/supplier/negotiations" replace />

  const { bid } = view
  const thread = bid.thread
  if (!thread) return <Navigate to={`/supplier/bids/${rfqId}`} replace />

  const buyerOffer = lastOfferFrom(thread, 'buyer')
  const yourOffer = lastOfferFrom(thread, 'supplier')
  const latest = thread.offers[thread.offers.length - 1]
  const agreed = agreedOffer(thread)
  const round = latest.version
  const open = thread.status === 'active' || thread.status === 'agreed'
  const awaitingYou = latest.by === 'buyer' && thread.status === 'active'
  const won = bid.status === 'won'
  /** The award this bid won, if any — carries the PO the agreed terms were locked into. */
  const award = won ? rfq.awards?.find((a) => a.bidId === thread.bidId) : undefined
  /** Terms are settled: the conversation is over and the rail reads as the agreed record. */
  const settled = !open || won

  // Seeded from your own latest position, so "revise" starts where you left off. When the buyer is
  // waiting on you, start at THEIR number instead — matching their ask is the common move, and the
  // pro-rata split shows immediately whether the lines can carry it.
  const source = yourOffer ?? latest
  const sourceLines = source.lines ?? []
  const buyerTarget = awaitingYou ? buyerOffer?.totalSar : undefined
  const draft = form ?? {
    lines: buyerTarget
      ? splitProRata(
          sourceLines.map((line) => ({
            index: line.index,
            unitPriceSar: line.unitPriceSar,
            quantity: line.quantity,
            included: line.included,
            deliveryDate: (line.deliveryDate ?? source.deliveryDate).slice(0, 10),
          })),
          buyerTarget,
        )
      : sourceLines.map((line) => ({
          index: line.index,
          unitPriceSar: line.unitPriceSar,
          quantity: line.quantity,
          included: line.included,
          deliveryDate: (line.deliveryDate ?? source.deliveryDate).slice(0, 10),
        })),
    delivery: source.deliveryDate.slice(0, 10),
    terms: source.paymentTermsLabel,
    preset: source.paymentPreset ?? rfq.paymentPreset,
    milestones: source.paymentMilestones ?? rfq.milestones,
    validUntil: bid.validUntil,
  }
  const patch = (next: Partial<typeof draft>) => setForm({ ...draft, ...next })
  /** Editing a line by hand re-syncs the target-total field to whatever the lines now come to. */
  const setLine = (index: number, next: Partial<CounterLineInput>) => {
    setTargetInput(null)
    setForm({
      ...draft,
      lines: draft.lines.map((line) => (line.index === index ? { ...line, ...next } : line)),
    })
  }

  // The form is line-driven; the target-total field is a pro-rata shortcut over the same lines,
  // so the two can never disagree — whichever the supplier touches, the other follows.
  const asOfferLines = draft.lines.map((line) => ({ ...line, name: '', unit: '' }))
  // Lines are VAT-inclusive: their sum is the total, and the subtotal divides back out of it.
  const total = offerTotal(asOfferLines)
  const { subtotal, vat } = priceTotals(total)
  const targetValue = targetInput ?? (total ? total.toFixed(2) : '')
  const onTargetChange = (raw: string) => {
    setTargetInput(raw)
    const value = Number(raw)
    if (value > 0) patch({ lines: splitProRata(draft.lines, value) })
  }
  const quotedLines = draft.lines.filter((line) => line.included)

  /**
   * How the lines reconcile against the number they are meant to hit. Pro-rata leaves halalas of
   * drift, and when the buyer is waiting the target is THEIR ask — so say plainly whether the lines
   * clear it, rather than only ever claiming a match.
   */
  const reconcile = () => {
    const against = buyerTarget ?? total
    const delta = Math.round((total - against) * 100) / 100
    if (Math.abs(delta) < 0.01) {
      return { text: t('rfq.supplier.nego.linesTotal', { amount: money(total) }), cls: 'text-status-success-strong' }
    }
    const key = delta > 0 ? 'rfq.supplier.nego.linesOver' : 'rfq.supplier.nego.linesUnder'
    return {
      text: t(key, { amount: money(total), delta: money(Math.abs(delta)) }),
      cls: 'text-status-warning-strong',
    }
  }
  const lines = reconcile()

  /**
   * One tag per offer: the newest round says whose reply it is waiting on, older ones just name
   * their author. Never both — "Buyer counter · Latest · awaiting you" says the same thing twice.
   */
  const tag = (offer: OfferVersion) => {
    const mine = offer.by === 'supplier'
    if (offer.version === latest.version && offer.version !== 1) {
      return mine
        ? { text: t('rfq.supplier.nego.tag.latestAwaiting'), cls: 'bg-status-warning-subtle text-status-warning-strong' }
        : { text: t('rfq.supplier.nego.tag.latestAwaitingYou'), cls: 'bg-status-info-subtle text-status-info' }
    }
    return mine
      ? { text: t('rfq.supplier.nego.tag.yourBid'), cls: 'bg-brand-subtle text-brand-strong' }
      : { text: t('rfq.supplier.nego.tag.buyerCounter'), cls: 'bg-status-info-subtle text-status-info' }
  }

  const applyTerms = (preset: PaymentPreset, milestones: Milestone[]) => {
    // The label is always the percentages, derived here so it can't drift from the schedule.
    patch({ preset, milestones, terms: milestones.map((m) => m.percent).join(' / ') })
    setTermsOpen(false)
  }

  /** The offer the rail describes: the agreed one once settled, otherwise whoever moved last. */
  const railOffer = agreed ?? latest
  /** How far apart the two sides still are — always a distance, so it reads without a sign. */
  const gap = Math.abs((yourOffer?.totalSar ?? 0) - (buyerOffer?.totalSar ?? 0))
  const focusRevise = () => reviseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })

  const resolveMsg = (offer: OfferVersion): string => {
    if (offer.message) return offer.message
    if (!offer.messageKey) return ''
    const params: Record<string, string | number> = { ...offer.messageParams }
    if (typeof params.amount === 'number') params.amount = money(params.amount)
    if (typeof params.best === 'number') params.best = money(params.best)
    return t(offer.messageKey, params)
  }

  const sendRevision = () => {
    if (total <= 0) return
    saveNego.mutate(
      {
        id: rfqId,
        thread: applySupplierCounter(thread, {
          lines: draft.lines.map((line) => ({
            ...line,
            deliveryDate: line.deliveryDate ? new Date(line.deliveryDate).toISOString() : undefined,
          })),
          deliveryDate: draft.delivery ? new Date(draft.delivery).toISOString() : source.deliveryDate,
          paymentTermsLabel: draft.terms.trim() || source.paymentTermsLabel,
          paymentPreset: draft.preset,
          paymentMilestones: draft.milestones,
          message,
        }),
      },
      {
        onSuccess: () => {
          setMessage('')
          setForm(null)
        },
      },
    )
  }

  const accept = () => saveNego.mutate({ id: rfqId, thread: acceptLatestOffer(thread, 'supplier') })

  const withdraw = (reason: string) => {
    saveNego.mutate({ id: rfqId, thread: { ...thread, status: 'ended' } })
    saveBid.mutate(
      { id: rfqId, bid: bidRecordFrom(view, { status: 'withdrawn', withdrawReason: reason }) },
      { onSuccess: () => navigate('/supplier/bids') },
    )
  }

  // The frame carries one title and moves the state into the third chip, so the headline names the
  // conversation and the chip says whose move it is.
  const heading = t('rfq.supplier.nego.heading', { title: rfq.title || t('rfq.list.untitled') })
  const stateChip = settled
    ? t('rfq.supplier.nego.chip.closed')
    : awaitingYou
      ? t('rfq.supplier.nego.chip.awaitingYou')
      : t('rfq.supplier.nego.chip.awaitingBuyer')

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <button
        type="button"
        onClick={() => navigate('/supplier/negotiations')}
        className="mp-press cursor-pointer text-sm font-medium text-content-secondary hover:text-content-primary"
      >
        ← {t('common.back')}
      </button>

      <nav className="mt-4 text-sm text-content-tertiary">
        <button
          type="button"
          onClick={() => navigate('/supplier/negotiations')}
          className="cursor-pointer text-content-link hover:underline"
        >
          {t('rfq.nego.title')}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{rfq.reference}</span>
      </nav>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className="rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-semibold text-content-secondary">
          {t('rfq.nego.round', { n: round })}
        </span>
        <span className="rounded-full bg-status-info-subtle px-2 py-0.5 text-xs font-semibold text-status-info">
          {t('rfq.nego.identityHidden')}
        </span>
        <span className="rounded-full bg-status-warning-subtle px-2 py-0.5 text-xs font-semibold text-status-warning-strong">
          {stateChip}
        </span>
        {award && (
          <span className="rounded-full bg-status-info-subtle px-2 py-0.5 text-xs font-semibold text-status-info">
            {t('rfq.supplier.nego.chip.lockedBy', { po: award.poNumber })}
          </span>
        )}
      </div>

      <h1 className="mt-2 text-2xl font-bold tracking-tight text-content-primary">{heading}</h1>
      <p className="mt-1 text-sm text-content-secondary">
        {t('rfq.supplier.verifiedBuyer')} · {categoryLabel(rfq.categories)} · {view.detail.deliverToCity} ·{' '}
        {rfq.reference} · {t('rfq.supplier.nego.everyOfferKept')}
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Panel>
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.nego.history')}</h2>
            <span className="text-xs text-content-tertiary">
              {t('rfq.supplier.nego.versionsKept', { count: thread.offers.length })}
            </span>
          </div>

          <ol className="mt-4 space-y-5">
            {thread.offers.map((offer) => {
              const mine = offer.by === 'supplier'
              const showDetail = expanded[offer.version] ?? false
              return (
                <li key={offer.version}>
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="rounded bg-bg-surface-sunken px-1.5 py-0.5 text-xs font-semibold text-content-tertiary">
                      v{offer.version}
                    </span>
                    <span className="font-semibold text-content-primary">
                      {mine ? t('rfq.nego.you') : t('rfq.supplier.nego.buyer')}
                    </span>
                    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium', tag(offer).cls)}>
                      {tag(offer).text}
                    </span>
                    <span className="ms-auto text-xs text-content-tertiary">{stamp(offer.at)}</span>
                  </div>

                  <div
                    className={cn(
                      'mt-2 grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg px-4 py-3 sm:grid-cols-4',
                      mine ? 'bg-brand-subtle/40' : 'bg-bg-surface-sunken',
                    )}
                  >
                    <Metric label={t('rfq.nego.cols.total')} value={money(offer.totalSar)} strong />
                    <Metric label={t('rfq.nego.cols.delivery')} value={dateFull(offer.deliveryDate)} />
                    <Metric label={t('rfq.nego.cols.terms')} value={offer.paymentTermsLabel} />
                    <Metric
                      label={t('rfq.nego.cols.items')}
                      value={t('rfq.detail.itemsOf', { covered: offer.itemsCovered, total: offer.itemsTotal })}
                    />
                  </div>

                  {resolveMsg(offer) && <p className="mt-2 text-sm text-content-secondary">{resolveMsg(offer)}</p>}

                  {(offer.lines?.length ?? 0) > 0 && (
                    <>
                      <button
                        type="button"
                        onClick={() =>
                          setExpanded((prev) => ({ ...prev, [offer.version]: !showDetail }))
                        }
                        className="mp-press mt-1.5 cursor-pointer text-xs font-medium text-content-link hover:underline"
                      >
                        {showDetail ? t('rfq.supplier.nego.hideDetails') : t('rfq.supplier.nego.viewDetails')}
                      </button>

                      {showDetail && (
                        <div className="mt-2 overflow-x-auto">
                          <table className="w-full min-w-[520px] text-sm">
                            <thead>
                              <tr className="border-b border-border-subtle text-xs font-medium text-content-tertiary">
                                <th className="w-8 py-1.5 text-start font-medium">#</th>
                                <th className="py-1.5 text-start font-medium">{t('rfq.detail.description')}</th>
                                <th className="w-20 py-1.5 text-start font-medium">{t('rfq.nego.form.qty')}</th>
                                <th className="w-24 py-1.5 text-start font-medium">
                                  {t('rfq.supplier.submit.unitPrice')}
                                </th>
                                <th className="w-28 py-1.5 text-start font-medium">{t('rfq.nego.form.lineTotal')}</th>
                                <th className="w-28 py-1.5 text-start font-medium">{t('rfq.nego.cols.delivery')}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-border-subtle">
                              {(offer.lines ?? [])
                                .filter((line) => line.included)
                                .map((line) => (
                                  <tr key={line.index}>
                                    <td className="py-1.5 text-content-tertiary">{line.index + 1}</td>
                                    <td className="py-1.5 text-content-primary">{line.name}</td>
                                    <td className="py-1.5 text-content-secondary">
                                      {line.quantity.toLocaleString()}
                                    </td>
                                    <td className="py-1.5 text-content-secondary">
                                      {line.unitPriceSar.toFixed(2)}
                                    </td>
                                    <td className="py-1.5 font-medium text-content-primary">
                                      {money(line.unitPriceSar * line.quantity)}
                                    </td>
                                    <td className="py-1.5 text-content-secondary">
                                      {dateFull(line.deliveryDate ?? offer.deliveryDate)}
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>

                          {/* The schedule behind the "30 / 60 / 10" label — the offer is the terms,
                              so the milestones belong in its audit record, not only in the editor. */}
                          {(offer.paymentMilestones?.length ?? 0) > 0 && (
                            <>
                              <p className="mt-3 text-xs font-medium text-content-secondary">
                                {t('rfq.supplier.nego.schedule', {
                                  preset: t(`rfq.create.payment.presets.${offer.paymentPreset ?? 'custom'}`),
                                  count: offer.paymentMilestones?.length ?? 0,
                                })}
                              </p>
                              <table className="mt-1 w-full min-w-[520px] text-sm">
                                <thead>
                                  <tr className="border-b border-border-subtle text-xs font-medium text-content-tertiary">
                                    <th className="w-8 py-1.5 text-start font-medium">#</th>
                                    <th className="py-1.5 text-start font-medium">
                                      {t('rfq.supplier.nego.scheduleTrigger')}
                                    </th>
                                    <th className="w-28 py-1.5 text-start font-medium">
                                      {t('rfq.supplier.nego.schedulePercent')}
                                    </th>
                                    <th className="w-28 py-1.5 text-start font-medium">
                                      {t('rfq.supplier.nego.scheduleAmount')}
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {(offer.paymentMilestones ?? []).map((milestone, i) => (
                                    <tr key={milestone.id}>
                                      <td className="py-1.5 text-content-tertiary">{i + 1}</td>
                                      <td className="py-1.5 text-content-primary">
                                        {t(`rfq.create.payment.triggers.${milestone.trigger}`)}
                                      </td>
                                      <td className="py-1.5 text-content-secondary">{milestone.percent}%</td>
                                      <td className="py-1.5 font-medium text-content-primary">
                                        {money(
                                          Math.round(((offer.totalSar * milestone.percent) / 100) * 100) / 100,
                                        )}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </>
                          )}

                          <p className="mt-2 text-xs text-content-tertiary">
                            {t('rfq.supplier.nego.detailFooter', {
                              date: dateFull(bid.validUntil),
                              covered: offer.itemsCovered,
                              total: offer.itemsTotal,
                            })}
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </li>
              )
            })}
          </ol>

          {open && !won && (
            <div ref={reviseRef} className="mt-6 border-t border-border-subtle pt-5">
              <label className="block max-w-sm">
                <span className="mb-1 block text-xs font-medium text-content-secondary">
                  {t('rfq.supplier.terms.validUntil')}
                </span>
                <input
                  type="date"
                  value={dateValue(draft.validUntil)}
                  onChange={(e) =>
                    patch({ validUntil: e.target.value ? new Date(e.target.value).toISOString() : '' })
                  }
                  className={inputClass}
                />
              </label>

              <p className="mt-5 text-sm font-semibold text-content-primary">
                {agreed ? t('rfq.supplier.nego.reviseWithdrawsAcceptance') : t('rfq.supplier.nego.reviseTitle')}
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="mb-1 block text-xs font-medium text-content-secondary">
                    {t('rfq.supplier.nego.targetTotal')}
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
                    {draft.terms}
                  </button>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold text-content-primary">
                  {t('rfq.supplier.nego.mapsToLines', { count: quotedLines.length })}
                </p>
                <span className="text-xs text-content-tertiary">{t('rfq.supplier.nego.proRataHint')}</span>
              </div>

              <div className="mt-2 overflow-x-auto">
                <div className="min-w-[560px]">
                  <div className={cn(LINE_GRID, 'border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary')}>
                    <span>#</span>
                    <span>{t('rfq.nego.form.description')}</span>
                    <span>{t('rfq.nego.form.qty')}</span>
                    <span>{t('rfq.nego.form.unitPrice')}</span>
                    <span>{t('rfq.nego.form.lineTotal')}</span>
                    <span>{t('rfq.nego.cols.delivery')}</span>
                  </div>
                  <ul className="divide-y divide-border-subtle">
                    {quotedLines.map((line) => {
                      const meta = sourceLines.find((l) => l.index === line.index)
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
                            aria-label={t('rfq.nego.form.qty')}
                            className={inputClass}
                          />
                          <input
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={line.unitPriceSar || ''}
                            onChange={(e) => setLine(line.index, { unitPriceSar: Number(e.target.value) || 0 })}
                            aria-label={t('rfq.nego.form.unitPrice')}
                            className={inputClass}
                          />
                          <span className="text-sm font-medium text-content-primary">
                            {money(line.unitPriceSar * line.quantity)}
                          </span>
                          <input
                            type="date"
                            value={line.deliveryDate ?? ''}
                            onChange={(e) => setLine(line.index, { deliveryDate: e.target.value })}
                            aria-label={t('rfq.nego.cols.delivery')}
                            className={inputClass}
                          />
                        </li>
                      )
                    })}
                  </ul>

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2.5">
                    <span className="text-xs text-content-tertiary">
                      {t('rfq.supplier.submit.subtotal', { count: quotedLines.length })} {money(subtotal)} ·{' '}
                      {t('rfq.supplier.vatLine')} {money(vat)}
                    </span>
                    <span className={cn('text-sm font-semibold', lines.cls)}>{lines.text}</span>
                  </div>
                </div>
              </div>

              <Textarea
                rows={2}
                className="mt-3"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('rfq.supplier.nego.messagePlaceholder')}
              />
              <Button className="mt-3" onClick={sendRevision} isLoading={saveNego.isPending} disabled={total <= 0}>
                {t('rfq.supplier.nego.sendRevised')}
              </Button>
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          {/*
           * One card, three readings of the same thread. Which number is "yours" and which is
           * "theirs" flips with whose move it is, so each state names its own rows rather than
           * leaving the supplier to work out whose figure they are looking at.
           */}
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content-primary">
                {settled
                  ? t('rfq.supplier.nego.agreedTerms')
                  : awaitingYou
                    ? t('rfq.supplier.nego.buyerCounterOffer')
                    : t('rfq.supplier.nego.yourLatestOffer')}
              </h2>
              <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-semibold text-brand-strong">
                {settled
                  ? t('rfq.supplier.nego.fromOffer', { n: (agreed ?? latest).version })
                  : t('rfq.supplier.nego.offerV', { n: latest.version })}
              </span>
            </div>
            <dl className="mt-3 space-y-2.5 text-sm">
              {awaitingYou && !settled ? (
                <>
                  <SummaryRow
                    label={t('rfq.supplier.nego.buyerOffers')}
                    value={money(buyerOffer?.totalSar ?? 0)}
                    valueClass="text-content-link"
                  />
                  <SummaryRow
                    label={t('rfq.supplier.nego.yourLastOffer')}
                    value={money(yourOffer?.totalSar ?? 0)}
                    valueClass="text-status-warning-strong"
                  />
                </>
              ) : (
                <>
                  <SummaryRow
                    label={t('rfq.supplier.nego.yourTotal')}
                    value={money((agreed ?? yourOffer ?? latest).totalSar)}
                    valueClass="text-content-link"
                  />
                  <SummaryRow
                    label={settled ? t('rfq.supplier.nego.buyerHadAsked') : t('rfq.supplier.nego.buyerAskedFor')}
                    value={money(buyerOffer?.totalSar ?? 0)}
                    valueClass="text-status-warning-strong"
                  />
                </>
              )}
              {settled ? (
                <SummaryRow
                  label={t('rfq.supplier.nego.purchaseOrder')}
                  value={award?.poNumber ?? t('rfq.supplier.nego.notIssued')}
                  valueClass={award ? 'text-content-primary' : 'text-status-warning-strong'}
                />
              ) : (
                <SummaryRow label={t('rfq.supplier.nego.gap')} value={money(gap)} />
              )}
              <SummaryRow
                label={t('rfq.nego.cols.delivery')}
                value={dateFull(railOffer.deliveryDate)}
              />
              <SummaryRow
                label={t('rfq.nego.itemsCovered')}
                value={t('rfq.detail.itemsOf', {
                  covered: railOffer.itemsCovered,
                  total: railOffer.itemsTotal,
                })}
              />
              <SummaryRow
                label={
                  settled
                    ? t('rfq.supplier.nego.agreedOn')
                    : awaitingYou
                      ? t('rfq.supplier.nego.received')
                      : t('rfq.supplier.nego.sent')
                }
                value={settled ? dateFull(thread.agreedAt || railOffer.at) : stamp(railOffer.at)}
              />
            </dl>
            <p className="mt-4 text-xs text-content-tertiary">
              {settled
                ? award
                  ? t('rfq.supplier.nego.agreedNote', {
                      po: award.poNumber,
                      date: dateFull(award.awardedAt),
                    })
                  : t('rfq.supplier.nego.endedNote')
                : awaitingYou
                  ? t('rfq.supplier.nego.awaitingYouNote')
                  : t('rfq.supplier.nego.awaitingBuyerNote')}
            </p>
            {/* The supplier orders module is not built yet, so this lands on its stub rather than a
                dead per-order URL. Repoint at /supplier/orders/:id once that ships. */}
            {settled && award && (
              <Button className="mt-4" fullWidth onClick={() => navigate('/supplier/orders')}>
                {t('rfq.supplier.nego.viewPurchaseOrder')}
              </Button>
            )}
          </Panel>

          {!settled && (
            <Panel className="space-y-2.5">
              <Button fullWidth onClick={accept} isLoading={saveNego.isPending} disabled={!awaitingYou}>
                {t('rfq.supplier.nego.acceptOffer', { amount: money(buyerOffer?.totalSar ?? 0) })}
              </Button>
              <Button fullWidth variant="outline" onClick={focusRevise}>
                {t('rfq.supplier.nego.reviseTitle')}
              </Button>
              <Button
                fullWidth
                variant="outline"
                className="text-status-danger hover:bg-status-danger-subtle"
                onClick={() => setWithdrawOpen(true)}
              >
                {t('rfq.supplier.withdraw.action')}
              </Button>
            </Panel>
          )}

          {/* Open: how the mechanism works. Settled: what the supplier does next. */}
          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">
              {settled ? t('rfq.supplier.nego.next.title') : t('rfq.supplier.nego.how.title')}
            </h2>
            <dl className="mt-3 space-y-3 text-sm">
              {settled ? (
                <>
                  <NextStep
                    label={t('rfq.supplier.nego.next.identity')}
                    body={t('rfq.supplier.nego.next.identityBody')}
                  />
                  <NextStep
                    label={t('rfq.supplier.nego.next.record')}
                    body={t('rfq.supplier.nego.next.recordBody')}
                  />
                  <NextStep label={t('rfq.supplier.nego.next.then')} body={t('rfq.supplier.nego.next.thenBody')} />
                </>
              ) : (
                <>
                  <NextStep
                    label={t('rfq.supplier.nego.how.anonymity')}
                    body={t('rfq.supplier.nego.how.anonymityBody')}
                  />
                  <NextStep
                    label={t('rfq.supplier.nego.how.versions')}
                    body={t('rfq.supplier.nego.how.versionsBody')}
                  />
                  <NextStep label={t('rfq.supplier.nego.how.award')} body={t('rfq.supplier.nego.how.awardBody')} />
                </>
              )}
            </dl>
          </Panel>
        </div>
      </div>

      <PaymentTermsDialog
        open={termsOpen}
        side="supplier"
        total={total}
        preset={draft.preset}
        milestones={draft.milestones}
        onClose={() => setTermsOpen(false)}
        onApply={applyTerms}
      />

      <WithdrawBidDialog
        open={withdrawOpen}
        reference={rfq.reference}
        onClose={() => setWithdrawOpen(false)}
        onConfirm={withdraw}
        loading={saveBid.isPending}
      />
    </section>
  )
}

function Metric({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div>
      <p className="text-xs text-content-tertiary">{label}</p>
      <p className={strong ? 'text-sm font-bold text-content-link' : 'text-sm font-medium text-content-primary'}>
        {value}
      </p>
    </div>
  )
}

function NextStep({ label, body }: { label: string; body: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold text-content-primary">{label}</dt>
      <dd className="mt-0.5 text-xs leading-relaxed text-content-secondary">{body}</dd>
    </div>
  )
}
