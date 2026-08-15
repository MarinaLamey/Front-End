import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Select } from '@/shared/ui/Select'
import { Spinner } from '@/shared/ui/Spinner'
import { cn } from '@/shared/lib/cn'
import { useRfq, useSaveSupplierBid } from '../hooks/rfqQueries'
import type { LineItem, SupplierBidLine, SupplierBidStatus } from '../types'
import { bidTotals, toSupplierView } from './deriveSupplierBid'
import { SUPPLIER_PROFILE } from './supplierProfile'
import { bidRecordFrom } from './bidRecord'
import { bidEligibility } from './bidRules'
import { Panel, SummaryRow } from './components'
import { useSupplierFormat } from './format'

const inputClass =
  'w-full rounded-lg border border-border-subtle bg-bg-surface px-3 py-2 text-sm text-content-primary outline-none transition-colors focus:border-brand-primary disabled:cursor-not-allowed disabled:opacity-50'

/**
 * SubmitBidPage — pricing the RFQ.
 *
 * One row per requested line: tick it to supply it, untick it to pass. Unit prices are entered
 * VAT-INCLUSIVE, so the line sum IS the bid total and nothing is added on top; the figure the
 * same number the buyer compares. Per-line delivery dates are only editable when the buyer allowed
 * partial delivery; otherwise every line carries the RFQ's single date (spec §6).
 */
export function SubmitBidPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: rfq, isLoading } = useRfq(id)
  const saveBid = useSaveSupplierBid()
  const { money, dateFull, dateValue } = useSupplierFormat()

  const view = useMemo(() => (rfq ? toSupplierView(rfq) : null), [rfq])
  const [draft, setDraft] = useState<{
    lines: SupplierBidLine[]
    validUntil: string
    paymentTermsLabel: string
    paymentTermsKind: 'accepted' | 'counter'
    attachments: string[]
  } | null>(null)
  const [editingTerms, setEditingTerms] = useState(false)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq || !view) return <Navigate to="/supplier/rfqs" replace />
  if (rfq.status !== 'live' || view.closingInDays < 0) {
    return <Navigate to={`/supplier/rfqs/${id}`} replace />
  }

  const { detail, bid } = view
  const buyerTerms = rfq.milestones.map((m) => m.percent).join(' / ')

  // Seeded lazily from the derived bid so a resumed draft opens exactly as it was saved.
  const form = draft ?? {
    lines: bid.lines,
    validUntil: bid.validUntil,
    paymentTermsLabel: bid.paymentTermsLabel || buyerTerms,
    paymentTermsKind: bid.paymentTermsKind,
    attachments: bid.attachments,
  }
  const setForm = (patch: Partial<typeof form>) => setDraft({ ...form, ...patch })
  const setLine = (index: number, patch: Partial<SupplierBidLine>) =>
    setDraft({
      ...form,
      lines: form.lines.map((line) => (line.index === index ? { ...line, ...patch } : line)),
    })

  const priced = form.lines.filter((line) => line.included && line.unitPriceSar > 0)
  const { subtotal, vat, total } = bidTotals(form.lines.filter((line) => line.included))
  const latestDelivery =
    priced
      .map((line) => line.deliveryDate)
      .sort()
      .at(-1) ?? ''

  const { minItems, validityOk, quantityOutOfRange, canSubmit } = bidEligibility(
    rfq,
    detail.lineItems.length,
    form.lines,
    form.validUntil,
    detail.lineItems,
  )
  const outOfRange = new Set(quantityOutOfRange)

  /** The buyer's accepted range for a line, or null when they left it open. */
  const quantityRangeHint = (item: LineItem): string | null => {
    const lo = item.minQuantity
    const hi = item.maxQuantity
    if (lo === undefined && hi === undefined) return null
    if (lo !== undefined && hi !== undefined)
      return t('rfq.supplier.submit.qtyRange', { min: lo.toLocaleString(), max: hi.toLocaleString() })
    if (lo !== undefined) return t('rfq.supplier.submit.qtyMin', { min: lo.toLocaleString() })
    return t('rfq.supplier.submit.qtyMax', { max: (hi as number).toLocaleString() })
  }

  const persist = (status: SupplierBidStatus, to: string) =>
    saveBid.mutate(
      {
        id: rfq.id,
        bid: bidRecordFrom(view, {
          status,
          lines: form.lines,
          validUntil: form.validUntil,
          paymentTermsLabel: form.paymentTermsLabel,
          paymentTermsKind: form.paymentTermsKind,
          attachments: form.attachments,
          submittedAt: status === 'submitted' ? new Date().toISOString() : bid.submittedAt,
        }),
      },
      { onSuccess: () => navigate(to) },
    )

  const removeAttachment = (name: string) =>
    setForm({ attachments: form.attachments.filter((a) => a !== name) })
  const addAttachment = (name: string) =>
    !form.attachments.includes(name) && setForm({ attachments: [...form.attachments, name] })
  const unattached = SUPPLIER_PROFILE.savedDocuments.filter((doc) => !form.attachments.includes(doc.name))

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <button
        type="button"
        onClick={() => navigate(`/supplier/rfqs/${rfq.id}`)}
        className="mp-press cursor-pointer text-sm font-medium text-content-secondary hover:text-content-primary"
      >
        ← {t('common.back')}
      </button>

      <nav className="mt-4 text-sm text-content-tertiary">
        <button
          type="button"
          onClick={() => navigate('/supplier/rfqs')}
          className="cursor-pointer text-content-link hover:underline"
        >
          {t('rfq.supplier.available.title')}
        </button>
        <span className="mx-1.5">/</span>
        <button
          type="button"
          onClick={() => navigate(`/supplier/rfqs/${rfq.id}`)}
          className="cursor-pointer text-content-link hover:underline"
        >
          {rfq.reference}
        </button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{t('rfq.supplier.submit.title')}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">
        {t('rfq.supplier.submit.title')}
      </h1>
      <p className="mt-1 text-sm text-content-secondary">
        {rfq.title || t('rfq.list.untitled')} · {rfq.reference} ·{' '}
        {t('rfq.supplier.available.closesIn', { count: view.closingInDays })}
      </p>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-6">
          <Panel>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-content-primary">{t('rfq.supplier.submit.pricing')}</h2>
              <span className="text-xs text-content-tertiary">{t('rfq.supplier.pricesIncludeVat')}</span>
            </div>

            <div className="mt-3 overflow-x-auto">
              <div className="min-w-[720px]">
                <div className="grid grid-cols-[28px_20px_minmax(0,1.5fr)_130px_52px_112px_104px_120px] items-center gap-2 border-b border-border-subtle pb-2 text-xs font-medium text-content-tertiary">
                  <span />
                  <span>#</span>
                  <span>{t('rfq.detail.description')}</span>
                  <span>{t('rfq.nego.form.qty')}</span>
                  <span>{t('rfq.supplier.detail.unit')}</span>
                  <span>{t('rfq.supplier.submit.unitPrice')}</span>
                  <span className="text-end">{t('rfq.nego.form.lineTotal')}</span>
                  <span>{t('rfq.supplier.submit.deliveryDate')}</span>
                </div>

                <ul className="divide-y divide-border-subtle">
                  {form.lines.map((line) => {
                    const item = detail.lineItems[line.index]
                    if (!item) return null
                    const off = !line.included
                    return (
                      <li
                        key={line.index}
                        className="grid grid-cols-[28px_20px_minmax(0,1.5fr)_130px_52px_112px_104px_120px] items-center gap-2 py-2.5"
                      >
                        <input
                          type="checkbox"
                          checked={line.included}
                          onChange={(e) => setLine(line.index, { included: e.target.checked })}
                          aria-label={item.name}
                          className="h-4 w-4 cursor-pointer accent-brand-primary"
                        />
                        <span className="text-sm text-content-tertiary">{line.index + 1}</span>
                        <span
                          className={cn(
                            'truncate text-sm font-medium',
                            off ? 'text-content-tertiary' : 'text-content-primary',
                          )}
                        >
                          {item.name}
                        </span>

                        <span className="flex items-center gap-2">
                          <input
                            type="number"
                            inputMode="numeric"
                            min={item.minQuantity ?? 0}
                            max={item.maxQuantity ?? item.quantity}
                            disabled={off}
                            value={off ? '' : line.quantity || ''}
                            onChange={(e) => setLine(line.index, { quantity: Number(e.target.value) || 0 })}
                            placeholder="—"
                            aria-label={`${item.name} ${t('rfq.nego.form.qty')}`}
                            className={cn(
                              inputClass,
                              'w-[76px] px-2',
                              // A quantity the buyer will not accept blocks submission, so it says so
                              // on the line rather than only greying the button at the bottom.
                              !off && outOfRange.has(line.index) && 'border-status-danger',
                            )}
                          />
                          <span
                            className={cn(
                              'whitespace-nowrap text-xs',
                              !off && outOfRange.has(line.index) ? 'text-status-danger' : 'text-content-tertiary',
                            )}
                          >
                            {quantityRangeHint(item) ?? t('rfq.supplier.submit.ofQty', { qty: item.quantity.toLocaleString() })}
                          </span>
                        </span>

                        <span className="text-sm text-content-tertiary">{item.unit}</span>

                        <input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          disabled={off}
                          value={off ? '' : line.unitPriceSar || ''}
                          onChange={(e) => setLine(line.index, { unitPriceSar: Number(e.target.value) || 0 })}
                          placeholder="—"
                          aria-label={`${item.name} ${t('rfq.supplier.submit.unitPrice')}`}
                          className={inputClass}
                        />

                        <span
                          className={cn(
                            'text-end text-sm',
                            off ? 'text-content-tertiary' : 'font-medium text-content-primary',
                          )}
                        >
                          {off
                            ? t('rfq.supplier.submit.notSupplying')
                            : money(line.unitPriceSar * line.quantity)}
                        </span>

                        <input
                          type="date"
                          disabled={off || !rfq.partialDeliveryAllowed}
                          value={dateValue(off ? '' : line.deliveryDate)}
                          onChange={(e) =>
                            setLine(line.index, {
                              deliveryDate: e.target.value ? new Date(e.target.value).toISOString() : '',
                            })
                          }
                          aria-label={`${item.name} ${t('rfq.supplier.submit.deliveryDate')}`}
                          className={inputClass}
                        />
                      </li>
                    )
                  })}
                </ul>

                <p className="mt-3 text-xs text-content-tertiary">
                  {rfq.partialBidsAllowed
                    ? t('rfq.supplier.submit.partialRule', {
                        min: minItems,
                        total: detail.lineItems.length,
                        quoting: priced.length,
                      })
                    : t('rfq.supplier.submit.allItemsRule', { total: detail.lineItems.length })}
                </p>

                <dl className="mt-3 space-y-2 border-t border-border-subtle pt-3 text-sm">
                  <SummaryRow
                    label={t('rfq.supplier.submit.subtotal', { count: priced.length })}
                    value={money(subtotal)}
                  />
                  <SummaryRow label={t('rfq.supplier.vatLine')} value={money(vat)} />
                  <div className="flex items-center justify-between border-t border-border-subtle pt-2">
                    <span className="font-semibold text-content-primary">{t('rfq.supplier.bidTotal')}</span>
                    <span className="text-base font-bold text-content-link">{money(total)}</span>
                  </div>
                </dl>
              </div>
            </div>
          </Panel>

          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.supplier.terms.title')}</h2>

            <label className="mt-3 block">
              <span className="mb-1 block text-xs font-medium text-content-secondary">
                {t('rfq.supplier.terms.validUntil')}
              </span>
              <input
                type="date"
                value={dateValue(form.validUntil)}
                onChange={(e) =>
                  setForm({ validUntil: e.target.value ? new Date(e.target.value).toISOString() : '' })
                }
                className={cn(inputClass, 'max-w-sm')}
              />
              {!validityOk && (
                <span className="mt-1 block text-xs text-status-danger">
                  {t('rfq.supplier.terms.validityHint')}
                </span>
              )}
            </label>

            <div className="mt-4">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-content-primary">
                  {t('rfq.supplier.detail.paymentTerms')}
                </p>
                <button
                  type="button"
                  onClick={() => setEditingTerms((open) => !open)}
                  className="mp-press cursor-pointer text-sm font-medium text-content-link hover:underline"
                >
                  {editingTerms ? t('rfq.supplier.terms.done') : t('rfq.supplier.terms.edit')}
                </button>
              </div>
              {editingTerms ? (
                <div className="mt-2 max-w-sm">
                  <input
                    type="text"
                    value={form.paymentTermsLabel}
                    onChange={(e) => setForm({ paymentTermsLabel: e.target.value, paymentTermsKind: 'counter' })}
                    aria-label={t('rfq.supplier.detail.paymentTerms')}
                    className={inputClass}
                  />
                  <button
                    type="button"
                    onClick={() => setForm({ paymentTermsLabel: buyerTerms, paymentTermsKind: 'accepted' })}
                    className="mp-press mt-2 cursor-pointer text-xs font-medium text-content-link hover:underline"
                  >
                    {t('rfq.supplier.terms.acceptBuyer', { terms: buyerTerms })}
                  </button>
                </div>
              ) : (
                <p className="mt-1 text-sm text-content-secondary">
                  {t('rfq.supplier.terms.buyerTerms', { terms: form.paymentTermsLabel })} ·{' '}
                  {t(`rfq.supplier.terms.${form.paymentTermsKind}`)}
                </p>
              )}
            </div>

            <div className="mt-4">
              <p className="text-xs font-medium text-content-tertiary">{t('rfq.supplier.terms.attachments')}</p>
              <Select
                className="mt-2"
                ariaLabel={t('rfq.supplier.terms.chooseSaved')}
                value=""
                onChange={addAttachment}
                disabled={unattached.length === 0}
                options={[
                  { value: '', label: t('rfq.supplier.terms.chooseSaved') },
                  ...unattached.map((doc) => ({ value: doc.name, label: `${doc.name} · ${doc.certifies}` })),
                ]}
              />
              <ul className="mt-2 space-y-2">
                {form.attachments.map((name) => {
                  const doc = SUPPLIER_PROFILE.savedDocuments.find((d) => d.name === name)
                  return (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-3 rounded-lg bg-bg-surface-sunken px-3 py-2.5"
                    >
                      <span className="min-w-0 truncate text-sm text-content-secondary">
                        {name}
                        {doc && <span className="text-content-tertiary"> · {doc.sizeKb} KB</span>}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(name)}
                        className="mp-press shrink-0 cursor-pointer text-sm font-medium text-status-danger hover:underline"
                      >
                        {t('rfq.list.actions.delete')}
                      </button>
                    </li>
                  )
                })}
              </ul>
              <p className="mt-2 text-xs text-content-tertiary">{t('rfq.supplier.terms.attachmentsHint')}</p>
            </div>
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel>
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.supplier.summary.title')}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <SummaryRow
                label={t('rfq.supplier.summary.itemsPriced')}
                value={t('rfq.bidsInbox.nOfM', { n: priced.length, m: detail.lineItems.length })}
              />
              <SummaryRow label={t('rfq.supplier.summary.delivery')} value={dateFull(latestDelivery)} />
              <SummaryRow label={t('rfq.supplier.summary.validUntil')} value={dateFull(form.validUntil)} />
              <SummaryRow
                label={t('rfq.supplier.bidTotal')}
                value={money(total)}
                valueClass="text-content-link"
              />
            </dl>
          </Panel>

          <Panel className="space-y-2.5">
            <Button
              fullWidth
              disabled={!canSubmit}
              isLoading={saveBid.isPending}
              onClick={() => persist('submitted', `/supplier/bids/${rfq.id}`)}
            >
              {t('rfq.supplier.submit.submit')}
            </Button>
            <Button
              fullWidth
              variant="outline"
              isLoading={saveBid.isPending}
              onClick={() => persist('draft', '/supplier/bids')}
            >
              {t('rfq.supplier.submit.saveDraft')}
            </Button>
            <p className="pt-1 text-xs text-content-tertiary">{t('rfq.supplier.submit.anonymityNote')}</p>
          </Panel>
        </div>
      </div>
    </section>
  )
}
