import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useAwardRfq, useRfq } from '../hooks/rfqQueries'
import { addDays, deriveRfqDetail } from './deriveRfqDetail'
import { buildAwards } from './award'
import { CompareOverrideDialog } from './CompareOverrideDialog'
import { RfqActionDialog } from './RfqActionDialog'
import type { Bid } from '../types'

const isActive = (b: Bid) => b.status === 'submitted' || b.status === 'negotiating'
const isCompliant = (b: Bid) => Object.values(b.compliance).every(Boolean)
const isEligible = (b: Bid) => isActive(b) && b.itemsCovered === b.itemsTotal && isCompliant(b)

/** Bid status as plain coloured text under each supplier's blind label. */
const BID_STATUS_TONE: Record<Bid['status'], string> = {
  submitted: 'text-content-secondary',
  negotiating: 'text-status-info',
  withdrawn: 'text-content-tertiary',
  declined: 'text-status-danger',
  expired: 'text-status-danger',
}

/** Collapse sorted 0-based line indexes into a 1-based, human range string, e.g. [0,1,2,4] → "1-3, 5". */
function formatRanges(indexes: number[]): string {
  const sorted = [...indexes].sort((a, b) => a - b)
  const parts: string[] = []
  let start = sorted[0]
  let prev = sorted[0]
  for (let k = 1; k <= sorted.length; k++) {
    const cur = sorted[k]
    if (cur === prev + 1) {
      prev = cur
      continue
    }
    parts.push(start === prev ? `${start + 1}` : `${start + 1}-${prev + 1}`)
    start = cur
    prev = cur
  }
  return parts.join(', ')
}

/**
 * CompareBidsPage — the buyer's split-award comparison. Columns are the SELECTED suppliers (from
 * ?bids=, else the best-3 eligible). Each column carries an "Include in award" checkbox; the sticky
 * bar aggregates the included set via {@link buildAwards} (lowest-price-per-line allocation) and
 * issues one PO per resolved supplier. Line prices, partial quantities and compliance are shown so
 * the buyer compares on merit while identities stay blind until award.
 */
export function CompareBidsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const [params] = useSearchParams()
  const { data: rfq, isLoading } = useRfq(id)
  const award = useAwardRfq()

  const [view, setView] = useState<'line' | 'summary'>('line')
  const [included, setIncluded] = useState<Record<string, boolean>>({})
  const [overrideReasons, setOverrideReasons] = useState<Record<string, string>>({})
  const [overrideTarget, setOverrideTarget] = useState<Bid | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const detail = useMemo(() => (rfq ? deriveRfqDetail(rfq) : null), [rfq])

  if (isLoading || !detail) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq) return <Navigate to="/buyer/rfqs" replace />
  if (rfq.status === 'awarded') return <Navigate to={`/buyer/rfqs/${id}/award`} replace />
  if (rfq.status === 'draft') return <Navigate to="/buyer/rfqs/new" replace />

  const locale = i18n.language
  const dateShort = (iso: string) =>
    iso
      ? new Intl.DateTimeFormat(locale, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
      : '—'
  const daysUntil = (iso: string) => (iso ? Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000) : 0)

  // Columns = the selected suppliers (blind labels), lowest total first.
  const byId = new Map(detail.bids.map((b) => [b.id, b]))
  const requestedIds = (params.get('bids') ?? '').split(',').map((s) => s.trim()).filter(Boolean)
  const requested = requestedIds.map((bid) => byId.get(bid)).filter((b): b is Bid => Boolean(b))
  const fallback = detail.bids.filter(isEligible).sort((a, b) => a.totalSar - b.totalSar).slice(0, 3)
  const columns = (requested.length ? requested : fallback).slice().sort((a, b) => a.totalSar - b.totalSar)

  const lineCount = detail.lineItems.length
  const negotiatingCount = detail.bids.filter((b) => b.status === 'negotiating').length
  const gridStyle = { gridTemplateColumns: `minmax(150px, 1.4fr) repeat(${columns.length}, minmax(0, 1fr))` }

  const isIncluded = (bidId: string) => included[bidId] ?? true
  const toggleInclude = (bidId: string) => setIncluded((prev) => ({ ...prev, [bidId]: !isIncluded(bidId) }))
  const includedIds = columns.filter((b) => isIncluded(b.id)).map((b) => b.id)
  const previewAwards = buildAwards(rfq, detail, includedIds)

  // Best full price per line (only columns that fully supply the line qualify) → green cell.
  const lowestFull = detail.lineItems.map((_, li) => {
    const prices = columns
      .map((b) => b.lines[li])
      .filter((l) => l && l.unitPrice !== null && l.qtyQuoted >= l.qtyRequired)
      .map((l) => l.unitPrice as number)
    return prices.length ? Math.min(...prices) : Infinity
  })
  const lowestTotal = columns.length ? Math.min(...columns.map((b) => b.totalSar)) : 0
  const latestDeliveryIso = (bid: Bid) => {
    let lastIdx = -1
    bid.lines.forEach((l, i) => {
      if (l.unitPrice !== null) lastIdx = i
    })
    return lastIdx >= 0 ? addDays(bid.deliveryDate, lastIdx) : bid.deliveryDate
  }
  const earliestLatest = columns.reduce(
    (m, b) => {
      const iso = latestDeliveryIso(b)
      return m === '' || iso < m ? iso : m
    },
    '' as string,
  )

  const qtyCoverage = (bid: Bid) => {
    let quoted = 0
    let required = 0
    bid.lines.forEach((l) => {
      quoted += l.qtyQuoted
      required += l.qtyRequired
    })
    const pct = required ? Math.round((quoted / required) * 100) : 0
    let reason: string | undefined
    if (pct < 100) {
      const nullIdx = bid.lines.findIndex((l) => l.unitPrice === null)
      const partialIdx = bid.lines.findIndex((l) => l.unitPrice !== null && l.qtyQuoted < l.qtyRequired)
      if (nullIdx >= 0) reason = t('rfq.compare.qtyReasonNotSupplied')
      else if (partialIdx >= 0) {
        const line = bid.lines[partialIdx]
        reason = t('rfq.compare.qtyReasonShort', { n: line.qtyRequired - line.qtyQuoted, i: partialIdx + 1 })
      }
    }
    return { pct, reason }
  }

  const complianceText = (cert: string, has: boolean) => {
    const attach = /mill test|test certificate/i.test(cert)
    if (has) return attach ? t('rfq.compare.attached') : t('rfq.compare.onFile')
    return attach ? t('rfq.compare.notAttached') : t('rfq.compare.missing')
  }

  const itemsLabel = (indexes: number[]) =>
    indexes.length === 1
      ? t('rfq.compare.itemLabel', { n: indexes[0] + 1 })
      : t('rfq.compare.itemsLabel', { range: formatRanges(indexes) })

  // Award-bar aggregation across the resolved (per-supplier) allocation.
  const coveredLines = previewAwards.reduce((s, a) => s + a.lineIndexes.length, 0)
  const coveragePct = lineCount ? Math.round((coveredLines / lineCount) * 100) : 0
  const agreedTotal = previewAwards.reduce((s, a) => s + a.agreedTotalSar, 0)
  const savedTotal = previewAwards.reduce((s, a) => s + a.savedVsOriginalSar, 0)
  const barLatestIso = previewAwards.reduce((m, a) => (a.deliveryDate > m ? a.deliveryDate : m), '')
  const allocation = previewAwards
    .map((a) => t('rfq.compare.awardBar.allocationItem', { supplier: a.supplierLabel, items: itemsLabel(a.lineIndexes) }))
    .join(', ')

  const awardedBids = previewAwards.map((a) => byId.get(a.bidId)).filter((b): b is Bid => Boolean(b))

  const missingDocs = (bid: Bid) =>
    Object.entries(bid.compliance)
      .filter(([, has]) => !has)
      .map(([cert]) => ({
        // The override list names each as a "… certificate" (unless the name already ends that way).
        cert: /certificate$/i.test(cert.trim()) ? cert : `${cert} certificate`,
        note: /mill test|test certificate/i.test(cert)
          ? t('rfq.compare.override.noteMill')
          : t('rfq.compare.override.noteRfq', { ref: rfq.reference }),
      }))

  const startAward = () => {
    if (previewAwards.length === 0) return
    const needsReason = awardedBids.filter((b) => !isCompliant(b) && !overrideReasons[b.id])
    if (needsReason.length > 0) {
      setOverrideTarget(needsReason[0])
      return
    }
    setConfirmOpen(true)
  }

  const confirmAward = () => {
    const awards = buildAwards(rfq, detail, includedIds).map((a) =>
      overrideReasons[a.bidId] ? { ...a, overrideReason: overrideReasons[a.bidId] } : a,
    )
    award.mutate({ id, awards }, { onSuccess: () => navigate(`/buyer/rfqs/${id}/award`) })
  }

  const onOverrideConfirm = (reason: string) => {
    if (!overrideTarget) return
    const nextReasons = { ...overrideReasons, [overrideTarget.id]: reason }
    setOverrideReasons(nextReasons)
    setOverrideTarget(null)
    const stillNeed = awardedBids.filter((b) => !isCompliant(b) && !nextReasons[b.id])
    if (stillNeed.length > 0) setOverrideTarget(stillNeed[0])
    else setConfirmOpen(true)
  }

  const Section = ({ label }: { label: string }) => (
    <p className="px-1 pt-4 text-xs font-semibold uppercase tracking-wide text-content-tertiary">{label}</p>
  )
  const Cell = ({ best, children }: { best?: boolean; children: React.ReactNode }) => (
    <div
      className={cn(
        'rounded-md px-3 py-1.5 text-sm',
        best ? 'bg-status-success-subtle font-medium text-status-success-strong' : 'text-content-primary',
      )}
    >
      {children}
    </div>
  )

  // Supplier column headers — shared by both views.
  const supplierHeaders = (
    <div className="grid items-end gap-4" style={gridStyle}>
      <p className="text-xs text-content-tertiary">
        {t('rfq.compare.comparingOf', { shown: columns.length, total: rfq.bids })}
      </p>
      {columns.map((bid) => (
        <div
          key={bid.id}
          className={cn('rounded-xl p-3', bid.totalSar === lowestTotal ? 'bg-brand-subtle' : 'bg-bg-surface-sunken')}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-content-primary">{bid.bidder}</p>
            {bid.totalSar === lowestTotal && (
              <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-semibold text-brand-primary-on">
                {t('rfq.compare.lowestTotal')}
              </span>
            )}
          </div>
          <p className={cn('mt-0.5 text-xs font-medium', BID_STATUS_TONE[bid.status])}>
            {t(`rfq.detail.bidStatus.${bid.status}`)}
          </p>
          <p className="mt-1 text-lg font-bold text-content-primary">
            {formatSar(toHalalas(bid.totalSar), { locale })}
          </p>
          <p className="text-xs text-content-tertiary">{t('rfq.compare.inclVat')}</p>
        </div>
      ))}
    </div>
  )

  // Per-column award controls — shared by both views.
  const awardControls = (
    <div className="grid items-start gap-4 border-t border-border-subtle pt-4" style={gridStyle}>
      <div className="text-sm font-semibold text-content-primary">{t('rfq.compare.includeInAward')}</div>
      {columns.map((bid) => {
        const full = bid.itemsCovered === bid.itemsTotal
        const compliant = isCompliant(bid)
        const compliantCount = Object.values(bid.compliance).filter(Boolean).length
        const certTotal = Object.keys(bid.compliance).length
        return (
          <div key={bid.id} className="flex flex-col gap-2">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-bg-surface-sunken p-2 text-sm font-medium text-content-secondary">
              <input
                type="checkbox"
                checked={isIncluded(bid.id)}
                onChange={() => toggleInclude(bid.id)}
                aria-label={`${t('rfq.compare.includeInAward')} · ${bid.bidder}`}
                className="h-4 w-4 cursor-pointer accent-brand-primary"
              />
              {bid.bidder}
            </label>
            <span
              className={cn(
                'rounded-md px-2 py-1 text-center text-xs font-medium',
                !compliant
                  ? 'bg-status-danger-subtle text-status-danger'
                  : full
                    ? 'bg-status-success-subtle text-status-success-strong'
                    : 'bg-status-warning-subtle text-status-warning-strong',
              )}
            >
              {!compliant
                ? t('rfq.compare.docsMissing', { count: certTotal - compliantCount })
                : full
                  ? t('rfq.compare.coversAll', { count: bid.itemsTotal })
                  : t('rfq.compare.coversSome', { covered: bid.itemsCovered, total: bid.itemsTotal })}
            </span>
            <p className="text-xs text-content-tertiary">{t('rfq.compare.docsOnFile', { n: compliantCount, m: certTotal })}</p>
            <p className="text-xs text-content-secondary">
              {bid.paymentTerms.kind === 'accepted' ? t('rfq.compare.termsAccepted') : t('rfq.compare.termsCountered')}
            </p>
            <Button
              variant="outline"
              size="sm"
              fullWidth
              onClick={() => navigate(`/buyer/negotiations/${id}/${bid.id}`)}
            >
              {bid.status === 'submitted' ? t('rfq.compare.negotiate') : t('rfq.compare.continueNegotiation')}
            </Button>
            {!compliant && (
              <button
                type="button"
                onClick={() => setOverrideTarget(bid)}
                className={cn(
                  'cursor-pointer text-center text-sm font-medium',
                  overrideReasons[bid.id]
                    ? 'text-status-success-strong'
                    : 'text-content-link hover:text-content-link-hover',
                )}
              >
                {t('rfq.compare.overrideWithReason')}
              </button>
            )}
          </div>
        )
      })}
    </div>
  )

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/rfqs')} className="cursor-pointer hover:text-content-secondary">
          {t('rfq.title')}
        </button>
        <span className="mx-1.5">/</span>
        <button type="button" onClick={() => navigate(`/buyer/rfqs/${id}`)} className="cursor-pointer hover:text-content-secondary">
          {rfq.reference}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{t('rfq.compare.title')}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">{t('rfq.compare.title')}</h1>
      <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-content-secondary">
        <span>
          {rfq.title || t('rfq.list.untitled')} · {rfq.reference}
        </span>
        <span className="font-medium text-content-secondary">{t('rfq.detail.bidsReceivedCount', { count: rfq.bids })}</span>
        {rfq.status === 'live' && daysUntil(rfq.closingDate) > 0 && (
          <span className="font-medium text-status-warning-strong">
            {t('rfq.compare.closesIn', { count: daysUntil(rfq.closingDate) })}
          </span>
        )}
        {negotiatingCount > 0 && (
          <span className="font-medium text-content-link">{t('rfq.compare.negotiatingWith', { count: negotiatingCount })}</span>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-status-info-subtle px-4 py-3 text-sm text-status-info">
        {t('rfq.compare.blindNote')}
      </div>

      <div className="mt-4">
        <SegmentedControl<'line' | 'summary'>
          ariaLabel={t('rfq.compare.view')}
          value={view}
          onChange={setView}
          className="w-auto"
          options={[
            { value: 'line', label: t('rfq.compare.lineByLine') },
            { value: 'summary', label: t('rfq.compare.summary') },
          ]}
        />
      </div>

      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface shadow-sm p-5">
        {columns.length === 0 ? (
          <p className="py-8 text-center text-sm text-content-tertiary">{t('rfq.compare.noneToCompare')}</p>
        ) : view === 'summary' ? (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-1">
              {supplierHeaders}

              <Section label={t('rfq.compare.atGlance.heading')} />
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.atGlance.differenceVsLowest')}</div>
                {columns.map((bid) => {
                  const diff = bid.totalSar - lowestTotal
                  return (
                    <Cell key={bid.id} best={diff === 0}>
                      {diff === 0
                        ? t('rfq.compare.atGlance.lowestTotal')
                        : t('rfq.compare.atGlance.diffPlus', { amount: formatSar(toHalalas(diff), { locale }) })}
                    </Cell>
                  )
                })}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.atGlance.itemsCovered')}</div>
                {columns.map((bid) => (
                  <Cell key={bid.id} best={bid.itemsCovered === bid.itemsTotal}>
                    {t('rfq.detail.itemsOf', { covered: bid.itemsCovered, total: bid.itemsTotal })}
                  </Cell>
                ))}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.atGlance.quantityCovered')}</div>
                {columns.map((bid) => {
                  const { pct, reason } = qtyCoverage(bid)
                  return (
                    <div key={bid.id} className={cn('rounded-md px-3 py-1.5', pct === 100 && 'bg-status-success-subtle')}>
                      <span className={cn('text-sm font-medium', pct === 100 ? 'text-status-success-strong' : 'text-content-primary')}>
                        {t('rfq.compare.qtyPct', { pct })}
                      </span>
                      {reason && <span className="block text-xs text-status-danger">{reason}</span>}
                    </div>
                  )
                })}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.atGlance.latestDelivery')}</div>
                {columns.map((bid) => {
                  const iso = latestDeliveryIso(bid)
                  return (
                    <Cell key={bid.id} best={iso === earliestLatest}>
                      {dateShort(iso)}
                    </Cell>
                  )
                })}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.atGlance.paymentTerms')}</div>
                {columns.map((bid) => (
                  <div key={bid.id} className="px-3 py-1.5 text-sm text-content-primary">
                    {bid.paymentTerms.kind === 'counter'
                      ? t('rfq.compare.counter', { terms: bid.paymentTerms.label })
                      : t('rfq.compare.accepted', { terms: bid.paymentTerms.label })}
                  </div>
                ))}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.atGlance.compliance')}</div>
                {columns.map((bid) => {
                  const compliantCount = Object.values(bid.compliance).filter(Boolean).length
                  const certTotal = Object.keys(bid.compliance).length
                  return (
                    <Cell key={bid.id} best={compliantCount === certTotal}>
                      {t('rfq.bidsInbox.nOfM', { n: compliantCount, m: certTotal })}
                    </Cell>
                  )
                })}
              </div>

              {awardControls}

              {/* Summary footer — in-card band with the pre-negotiation total + Award-suppliers CTA. */}
              {previewAwards.length > 0 && (
                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-xl bg-bg-surface-sunken p-4">
                  <div className="min-w-0 space-y-1 text-sm">
                    <p className="font-semibold text-content-primary">
                      {t('rfq.compare.awardBar.selectedSuppliers', { n: previewAwards.length })}
                      {' · '}
                      {t('rfq.compare.awardBar.covers', { x: coveredLines, y: lineCount, pct: coveragePct })}
                    </p>
                    <p className="text-content-secondary">
                      {t('rfq.compare.awardBar.total')}:{' '}
                      <span className="font-semibold text-content-primary">
                        {formatSar(toHalalas(agreedTotal + savedTotal), { locale })}
                      </span>
                      {' · '}
                      {allocation}
                      {' · '}
                      {t('rfq.compare.awardBar.latestDelivery')} {dateShort(barLatestIso)}
                    </p>
                  </div>
                  <Button className="mp-press" onClick={startAward} isLoading={award.isPending}>
                    {t('rfq.compare.awardBar.awardSuppliers', { n: previewAwards.length })}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-1">
              {supplierHeaders}

              <Section label={t('rfq.compare.lineItemsUnit')} />
              {detail.lineItems.map((item, li) => (
                <div key={item.id} className="grid items-center gap-4" style={gridStyle}>
                  <div className="text-sm text-content-secondary">
                    {li + 1} · {item.name}
                  </div>
                  {columns.map((bid) => {
                    const line = bid.lines[li]
                    if (!line || line.unitPrice === null) {
                      return (
                        <div key={bid.id} className="px-3 py-1.5 text-sm font-medium text-status-danger">
                          {t('rfq.compare.notSupplying')}
                        </div>
                      )
                    }
                    const partial = line.qtyQuoted < line.qtyRequired
                    const best = !partial && line.unitPrice === lowestFull[li]
                    return (
                      <div key={bid.id} className={cn('rounded-md px-3 py-1.5', best && 'bg-status-success-subtle')}>
                        <div className={cn('text-sm font-medium', best ? 'text-status-success-strong' : 'text-content-primary')}>
                          {line.unitPrice.toFixed(2)}
                        </div>
                        <div className={cn('text-xs', partial ? 'font-medium text-status-danger' : 'text-content-tertiary')}>
                          {partial
                            ? `${t('rfq.compare.partialOf', { q: line.qtyQuoted, r: line.qtyRequired })} · ${line.deliveryLabel}`
                            : `${line.qtyQuoted} · ${line.deliveryLabel}`}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.itemsPriced')}</div>
                {columns.map((bid) => (
                  <div key={bid.id} className="px-3 py-1.5 text-sm text-content-secondary">
                    {t('rfq.detail.itemsOf', { covered: bid.itemsCovered, total: bid.itemsTotal })}
                  </div>
                ))}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.quantityCovered')}</div>
                {columns.map((bid) => {
                  const { pct, reason } = qtyCoverage(bid)
                  return (
                    <div key={bid.id} className="px-3 py-1.5">
                      <span className={cn('text-sm', pct === 100 ? 'text-content-primary' : 'font-medium text-status-danger')}>
                        {t('rfq.compare.qtyPct', { pct })}
                      </span>
                      {reason && <span className="block text-xs text-content-tertiary">{reason}</span>}
                    </div>
                  )
                })}
              </div>

              <Section label={t('rfq.compare.deliveryTerms')} />
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.latestDelivery')}</div>
                {columns.map((bid) => {
                  const iso = latestDeliveryIso(bid)
                  return (
                    <Cell key={bid.id} best={iso === earliestLatest}>
                      {dateShort(iso)}
                    </Cell>
                  )
                })}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.paymentTerms')}</div>
                {columns.map((bid) => (
                  <div key={bid.id} className="px-3 py-1.5 text-sm text-content-primary">
                    {bid.paymentTerms.kind === 'counter'
                      ? t('rfq.compare.counter', { terms: bid.paymentTerms.label })
                      : t('rfq.compare.accepted', { terms: bid.paymentTerms.label })}
                  </div>
                ))}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.bidValidUntil')}</div>
                {columns.map((bid) => (
                  <div key={bid.id} className="px-3 py-1.5 text-sm text-content-secondary">
                    {dateShort(bid.validUntil)}
                  </div>
                ))}
              </div>

              <Section label={t('rfq.compare.compliance')} />
              {detail.certifications.map((cert) => (
                <div key={cert} className="grid items-center gap-4 border-t border-border-subtle" style={gridStyle}>
                  <div className="py-2 text-sm text-content-secondary">{cert}</div>
                  {columns.map((bid) => (
                    <div
                      key={bid.id}
                      className={cn('px-3 py-2 text-sm', bid.compliance[cert] ? 'text-content-primary' : 'font-medium text-status-danger')}
                    >
                      {complianceText(cert, bid.compliance[cert])}
                    </div>
                  ))}
                </div>
              ))}

              {awardControls}
            </div>
          </div>
        )}
      </div>

      {/* Line-by-line: floating sticky bar with the negotiated agreed total + savings. */}
      {view === 'line' && previewAwards.length > 0 && (
        <div className="sticky bottom-4 z-10 mt-4 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-bg-surface p-4 shadow-lg">
          <div className="min-w-0 space-y-1 text-sm">
            <p className="font-semibold text-content-primary">
              {t('rfq.compare.awardBar.selectedSuppliers', { n: previewAwards.length })}
              {' · '}
              {t('rfq.compare.awardBar.covers', { x: coveredLines, y: lineCount, pct: coveragePct })}
            </p>
            <p className="text-content-secondary">
              {t('rfq.compare.awardBar.agreedTotal')}:{' '}
              <span className="font-semibold text-content-primary">{formatSar(toHalalas(agreedTotal), { locale })}</span>
              {' · '}
              <span className="text-status-success-strong">
                {t('rfq.compare.awardBar.savedVsOriginal', { amount: formatSar(toHalalas(savedTotal), { locale }) })}
              </span>
            </p>
            <p className="text-xs text-content-tertiary">
              {allocation}
              {' · '}
              {t('rfq.compare.awardBar.latestDelivery')} {dateShort(barLatestIso)}
            </p>
          </div>
          <Button className="mp-press" onClick={startAward} isLoading={award.isPending}>
            {t('rfq.compare.awardBar.awardIssue', { n: previewAwards.length })}
          </Button>
        </div>
      )}

      <p className="mt-3 text-xs text-content-tertiary">{t('rfq.compare.awardFootnote')}</p>

      {/* Missing-docs override — captures a reason per non-compliant included supplier before award. */}
      <CompareOverrideDialog
        open={overrideTarget !== null}
        supplierLabel={overrideTarget?.bidder ?? ''}
        missing={overrideTarget ? missingDocs(overrideTarget) : []}
        onClose={() => setOverrideTarget(null)}
        onConfirm={onOverrideConfirm}
      />

      {/* Award confirmation — one bullet per resolved supplier + PO + amount. */}
      <RfqActionDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmAward}
        loading={award.isPending}
        title={t('rfq.compare.confirm.title', { n: previewAwards.length })}
        badge={{ text: rfq.reference, tone: 'neutral' }}
        body={t('rfq.compare.confirm.body', {
          n: previewAwards.length,
          amount: formatSar(toHalalas(agreedTotal), { locale }),
        })}
        callout={{
          heading: t('rfq.compare.confirm.cannotUndo'),
          tone: 'warning',
          bullets: [
            ...previewAwards.map((a) =>
              t('rfq.compare.confirm.bulletPo', {
                supplier: a.supplierLabel,
                po: a.poNumber,
                items: itemsLabel(a.lineIndexes),
                amount: formatSar(toHalalas(a.agreedTotalSar), { locale }),
              }),
            ),
            t('rfq.compare.confirm.bulletReveal'),
            t('rfq.compare.confirm.bulletLosers', { count: rfq.bids - previewAwards.length }),
          ],
        }}
        confirmLabel={t('rfq.compare.confirm.awardIssue')}
        confirmTone="primary"
        cancelLabel={t('rfq.compare.confirm.reviewAgain')}
      />
    </section>
  )
}
