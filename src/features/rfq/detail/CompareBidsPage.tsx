import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { SegmentedControl } from '@/shared/ui/SegmentedControl'
import { Select } from '@/shared/ui/Select'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useAwardRfq, useRfq } from '../hooks/rfqQueries'
import { deriveRfqDetail } from './deriveRfqDetail'
import { buildAward } from './award'
import { CompareOverrideDialog } from './CompareOverrideDialog'
import type { Bid } from '../types'

type SortKey = 'total' | 'match' | 'delivery'

export function CompareBidsPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: rfq, isLoading } = useRfq(id)
  const award = useAwardRfq()

  const [view, setView] = useState<'line' | 'summary'>('line')
  const [compliantOnly, setCompliantOnly] = useState(false)
  const [sort, setSort] = useState<SortKey>('total')
  const [override, setOverride] = useState<Bid | null>(null)

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

  const isCompliant = (b: Bid) => Object.values(b.compliance).every(Boolean)
  const dateShort = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'

  const filtered = detail.bids.filter((b) => !compliantOnly || isCompliant(b))
  const sorted = [...filtered].sort((a, b) => {
    if (sort === 'match') return b.matchPct - a.matchPct
    if (sort === 'delivery') return a.deliveryDate.localeCompare(b.deliveryDate)
    return a.totalSar - b.totalSar
  })
  const comparing = sorted.slice(0, 3)
  const negotiatingCount = detail.bids.filter((b) => b.status === 'negotiating').length

  // Best-in-column markers (computed across the compared set only).
  const lowestUnit = detail.lineItems.map((_, li) =>
    Math.min(...comparing.map((b) => b.unitPrices[li]).filter((p): p is number => p !== null), Infinity),
  )
  const lowestTotal = Math.min(...comparing.map((b) => b.totalSar))
  const earliestDelivery = comparing.reduce((m, b) => (b.deliveryDate < m ? b.deliveryDate : m), comparing[0]?.deliveryDate ?? '')
  const shortestLead = Math.min(...comparing.map((b) => b.leadTimeDays))

  const gridStyle = { gridTemplateColumns: `minmax(150px, 1.4fr) repeat(${comparing.length}, minmax(0, 1fr))` }

  const complianceText = (cert: string, has: boolean) => {
    const attach = /mill test|test certificate/i.test(cert)
    if (has) return attach ? t('rfq.compare.attached') : t('rfq.compare.onFile')
    return attach ? t('rfq.compare.notAttached') : t('rfq.compare.missing')
  }

  const doAward = (bid: Bid, reason?: string) =>
    award.mutate(
      { id, award: buildAward(rfq, detail, bid, reason) },
      { onSuccess: () => navigate(`/buyer/rfqs/${id}/award`) },
    )

  const onAward = (bid: Bid) => (isCompliant(bid) ? doAward(bid) : setOverride(bid))
  const missingDocs = (bid: Bid) =>
    Object.entries(bid.compliance)
      .filter(([, has]) => !has)
      .map(([cert]) => ({
        cert,
        note: /mill test|test certificate/i.test(cert)
          ? t('rfq.compare.override.noteMill')
          : t('rfq.compare.override.noteRfq', { ref: rfq.reference }),
      }))

  const Cell = ({ best, children, className }: { best?: boolean; children: React.ReactNode; className?: string }) => (
    <div
      className={cn(
        'rounded-md px-3 py-1.5 text-sm',
        best ? 'bg-status-success-subtle font-medium text-status-success-strong' : 'text-content-primary',
        className,
      )}
    >
      {children}
    </div>
  )
  const Section = ({ label }: { label: string }) => (
    <p className="px-1 pt-4 text-xs font-semibold uppercase tracking-wide text-content-tertiary">{label}</p>
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
        <span>{rfq.title || t('rfq.list.untitled')} · {rfq.reference}</span>
        <span className="font-medium text-content-secondary">{t('rfq.detail.bidsReceivedCount', { count: rfq.bids })}</span>
        {negotiatingCount > 0 && (
          <span className="font-medium text-content-link">{t('rfq.compare.negotiatingWith', { count: negotiatingCount })}</span>
        )}
      </div>

      <div className="mt-4 rounded-lg bg-status-info-subtle px-4 py-3 text-sm text-status-info">
        {t('rfq.compare.blindNote')}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setCompliantOnly((v) => !v)}
            className={cn(
              'cursor-pointer rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              compliantOnly
                ? 'border-brand-primary bg-brand-subtle text-brand-primary'
                : 'border-border-subtle text-content-secondary hover:text-content-primary',
            )}
          >
            {t('rfq.compare.compliantOnly')}
          </button>
          <Select
            ariaLabel={t('rfq.compare.sort')}
            value={sort}
            onChange={(v) => setSort(v as SortKey)}
            options={[
              { value: 'total', label: t('rfq.compare.sortTotal') },
              { value: 'match', label: t('rfq.compare.sortMatch') },
              { value: 'delivery', label: t('rfq.compare.sortDelivery') },
            ]}
          />
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-border-subtle bg-bg-surface p-5">
        {comparing.length === 0 ? (
          <p className="py-8 text-center text-sm text-content-tertiary">{t('rfq.compare.noneToCompare')}</p>
        ) : view === 'summary' ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {comparing.map((bid) => (
              <div
                key={bid.id}
                className={cn(
                  'rounded-xl border p-4',
                  bid.totalSar === lowestTotal ? 'border-brand-primary bg-brand-subtle' : 'border-border-subtle',
                )}
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-content-primary">{bid.bidder}</p>
                  <span className="rounded-full bg-bg-surface-sunken px-2 py-0.5 text-xs font-medium text-content-secondary">
                    {t('rfq.compare.matchPct', { pct: bid.matchPct })}
                  </span>
                </div>
                <p className="mt-2 text-lg font-bold text-content-primary">{formatSar(toHalalas(bid.totalSar))}</p>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <Row label={t('rfq.compare.itemsPriced')} value={t('rfq.detail.itemsOf', { covered: bid.itemsCovered, total: bid.itemsTotal })} />
                  <Row label={t('rfq.compare.delivery')} value={dateShort(bid.deliveryDate)} />
                  <Row label={t('rfq.compare.compliance')} value={`${Object.values(bid.compliance).filter(Boolean).length}/${Object.keys(bid.compliance).length}`} />
                </dl>
                <Button className="mt-3" fullWidth size="sm" onClick={() => onAward(bid)}>
                  {t('rfq.compare.award')}
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[720px] space-y-1">
              {/* Supplier headers */}
              <div className="grid items-end gap-4" style={gridStyle}>
                <p className="text-xs text-content-tertiary">
                  {t('rfq.compare.comparingOf', { shown: comparing.length, total: rfq.bids })}
                </p>
                {comparing.map((bid) => (
                  <div
                    key={bid.id}
                    className={cn(
                      'rounded-xl p-3',
                      bid.totalSar === lowestTotal ? 'bg-brand-subtle' : 'bg-bg-surface-sunken',
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-content-primary">{bid.bidder}</p>
                      {bid.totalSar === lowestTotal && (
                        <span className="rounded-full bg-brand-primary px-2 py-0.5 text-[10px] font-semibold text-brand-primary-on">
                          {t('rfq.compare.lowestTotal')}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex items-center gap-2 text-xs">
                      <span className="rounded-full bg-bg-surface px-1.5 py-0.5 font-medium text-brand-strong">
                        {t('rfq.compare.matchPct', { pct: bid.matchPct })}
                      </span>
                      <span className="text-content-link">{t(`rfq.detail.bidStatus.${bid.status}`)}</span>
                    </div>
                    <p className="mt-2 text-lg font-bold text-content-primary">{formatSar(toHalalas(bid.totalSar))}</p>
                    <p className="text-xs text-content-tertiary">{t('rfq.compare.inclVat')}</p>
                  </div>
                ))}
              </div>

              <Section label={t('rfq.compare.lineItemsUnit')} />
              {detail.lineItems.map((item, li) => (
                <div key={item.id} className="grid items-center gap-4" style={gridStyle}>
                  <div className="text-sm text-content-secondary">{li + 1} · {item.name}</div>
                  {comparing.map((bid) => {
                    const p = bid.unitPrices[li]
                    return p === null ? (
                      <div key={bid.id} className="px-3 py-1.5 text-sm font-medium text-status-danger">
                        {t('rfq.compare.notSupplying')}
                      </div>
                    ) : (
                      <Cell key={bid.id} best={p === lowestUnit[li]}>
                        {p.toFixed(2)}
                      </Cell>
                    )
                  })}
                </div>
              ))}
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.itemsPriced')}</div>
                {comparing.map((bid) => (
                  <div key={bid.id} className="px-3 py-1.5 text-sm text-content-secondary">
                    {t('rfq.detail.itemsOf', { covered: bid.itemsCovered, total: bid.itemsTotal })}
                  </div>
                ))}
              </div>

              <Section label={t('rfq.compare.deliveryTerms')} />
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.proposedDelivery')}</div>
                {comparing.map((bid) => (
                  <Cell key={bid.id} best={bid.deliveryDate === earliestDelivery}>{dateShort(bid.deliveryDate)}</Cell>
                ))}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.leadTime')}</div>
                {comparing.map((bid) => (
                  <Cell key={bid.id} best={bid.leadTimeDays === shortestLead}>
                    {t('rfq.compare.days', { count: bid.leadTimeDays })}
                  </Cell>
                ))}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.paymentTerms')}</div>
                {comparing.map((bid) => (
                  <div key={bid.id} className="px-3 py-1.5 text-sm text-content-primary">
                    {bid.paymentTerms.kind === 'counter'
                      ? t('rfq.compare.counter', { terms: bid.paymentTerms.label })
                      : t('rfq.compare.accepted', { terms: bid.paymentTerms.label })}
                  </div>
                ))}
              </div>
              <div className="grid items-center gap-4" style={gridStyle}>
                <div className="text-sm text-content-secondary">{t('rfq.compare.bidValidUntil')}</div>
                {comparing.map((bid) => (
                  <div key={bid.id} className="px-3 py-1.5 text-sm text-content-secondary">{dateShort(bid.validUntil)}</div>
                ))}
              </div>

              <Section label={t('rfq.compare.compliance')} />
              {detail.certifications.map((cert) => (
                <div key={cert} className="grid items-center gap-4 border-t border-border-subtle" style={gridStyle}>
                  <div className="py-2 text-sm text-content-secondary">{cert}</div>
                  {comparing.map((bid) => (
                    <div
                      key={bid.id}
                      className={cn('px-3 py-2 text-sm', bid.compliance[cert] ? 'text-content-primary' : 'font-medium text-status-danger')}
                    >
                      {complianceText(cert, bid.compliance[cert])}
                    </div>
                  ))}
                </div>
              ))}

              {/* Footer actions */}
              <div className="grid items-start gap-4 pt-4" style={gridStyle}>
                <div />
                {comparing.map((bid) => {
                  const full = bid.itemsCovered === bid.itemsTotal
                  const compliant = isCompliant(bid)
                  return (
                    <div key={bid.id} className="flex flex-col gap-2">
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
                          ? t('rfq.compare.docsMissing', { count: Object.values(bid.compliance).filter((v) => !v).length })
                          : full
                            ? t('rfq.compare.coversAll', { count: bid.itemsTotal })
                            : t('rfq.compare.coversSome', { covered: bid.itemsCovered, total: bid.itemsTotal })}
                      </span>
                      <Button fullWidth onClick={() => onAward(bid)} isLoading={award.isPending && override?.id === bid.id}>
                        {t('rfq.compare.award')}
                      </Button>
                      <Button variant="outline" fullWidth onClick={() => navigate(`/buyer/negotiations/${id}/${bid.id}`)}>
                        {bid.status === 'submitted' ? t('rfq.compare.negotiate') : t('rfq.compare.continueNegotiation')}
                      </Button>
                      {!compliant && (
                        <button
                          type="button"
                          onClick={() => setOverride(bid)}
                          className="cursor-pointer text-center text-sm font-medium text-content-link hover:text-content-link-hover"
                        >
                          {t('rfq.compare.overrideWithReason')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-content-tertiary">{t('rfq.compare.awardFootnote')}</p>

      <CompareOverrideDialog
        open={override !== null}
        supplierLabel={override?.bidder ?? ''}
        missing={override ? missingDocs(override) : []}
        loading={award.isPending}
        onClose={() => setOverride(null)}
        onConfirm={(reason) => override && doAward(override, reason)}
      />
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className="font-medium text-content-primary">{value}</dd>
    </div>
  )
}
