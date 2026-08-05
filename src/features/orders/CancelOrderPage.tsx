import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { cn } from '@/shared/lib/cn'
import { useCancelOrder, useOrder } from './hooks/orderQueries'
import { orderTotals } from './lib'

const REASONS = ['no_longer_required', 'budget_withdrawn', 'sourcing_error', 'better_offer', 'supplier_unresponsive', 'other']

export function CancelOrderPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const cancel = useCancelOrder()

  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [rfqChoice, setRfqChoice] = useState<'runner_up' | 'close'>('runner_up')

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/buyer/orders" replace />
  if (order.status !== 'awaiting_acceptance' && order.status !== 'in_transit') {
    return <Navigate to={`/buyer/orders/${order.id}`} replace />
  }

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const preAcceptance = order.status === 'awaiting_acceptance'
  const canCancel = reason.length > 0 && note.trim().length > 0

  const doCancel = () =>
    cancel.mutate(
      { id: order.id, reason, note: note.trim() },
      { onSuccess: () => navigate(`/buyer/orders/${order.id}`) },
    )

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/orders')} className="cursor-pointer hover:text-content-secondary">{t('order.title')}</button>
        <span className="mx-1.5">/</span>
        <button type="button" onClick={() => navigate(`/buyer/orders/${order.id}`)} className="cursor-pointer hover:text-content-secondary">{order.poNumber}</button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{t('order.cancel.crumb')}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">{t('order.cancel.heading')}</h1>
      <p className="mt-1 text-sm text-content-secondary">{order.poNumber} · {order.title} · {money(orderTotals(order).total)}</p>

      <div className={cn('mt-4 rounded-xl px-4 py-3 text-sm', preAcceptance ? 'bg-status-success-subtle text-status-success-strong' : 'bg-status-warning-subtle text-status-warning-strong')}>
        {preAcceptance ? t('order.cancel.bannerDirect') : t('order.cancel.bannerAgreement')}
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="auth-stagger space-y-6">
          {/* Reason */}
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.cancel.whyTitle')}</h2>
            <div className="mt-3 flex flex-wrap gap-2">
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setReason(r)}
                  className={cn(
                    'mp-press rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                    reason === r ? 'border-brand-primary bg-brand-subtle text-brand-primary' : 'border-border-subtle text-content-secondary hover:text-content-primary',
                  )}
                >
                  {t(`order.cancel.reason.${r}`)}
                </button>
              ))}
            </div>
            <label className="mt-4 block text-sm font-medium text-content-secondary">{t('order.cancel.noteLabel')}</label>
            <Textarea rows={3} className="mt-1.5" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t('order.cancel.notePlaceholder')} />
            <p className="mt-2 text-xs text-content-tertiary">{t('order.cancel.noteHint')}</p>
          </div>

          {/* What happens to the RFQ (pre-acceptance direct cancel only) */}
          {preAcceptance && (
            <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
              <h2 className="text-sm font-semibold text-content-primary">{t('order.cancel.rfqTitle', { rfq: order.rfqReference })}</h2>
              <div className="mt-3 space-y-3">
                <ChoiceRow
                  active={rfqChoice === 'runner_up'}
                  onClick={() => setRfqChoice('runner_up')}
                  title={t('order.cancel.rfq.runnerUp.title')}
                  desc={order.runnerUp
                    ? t('order.cancel.rfq.runnerUp.desc', { label: order.runnerUp.supplierLabel, total: money(order.runnerUp.totalSar), covered: order.runnerUp.itemsCovered, total_items: order.runnerUp.itemsTotal, date: new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(order.runnerUp.validUntil)) })
                    : t('order.cancel.rfq.runnerUp.none')}
                />
                <ChoiceRow
                  active={rfqChoice === 'close'}
                  onClick={() => setRfqChoice('close')}
                  title={t('order.cancel.rfq.close.title')}
                  desc={t('order.cancel.rfq.close.desc')}
                />
              </div>
            </div>
          )}
        </div>

        {/* Right rail */}
        <div className="auth-stagger space-y-5">
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.po.summaryTitle')}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('order.po.reference')} value={order.poNumber} />
              <Row label={t('order.supplier')} value={order.supplierShort} />
              <Row label={t('order.po.total')} value={money(orderTotals(order).total)} />
              <Row label={t('order.ship.status')} value={preAcceptance ? t('order.status.awaitingLong') : t('order.status.inTransit')} valueClass="font-semibold text-status-warning-strong" />
            </dl>
            <p className="mt-3 text-xs text-content-tertiary">{preAcceptance ? t('order.cancel.noConsequence') : t('order.cancel.agreementNote')}</p>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface p-5">
            <Button variant="danger" fullWidth disabled={!canCancel} isLoading={cancel.isPending} onClick={doCancel}>
              {t('order.cancel.confirm')}
            </Button>
            <Button variant="outline" fullWidth onClick={() => navigate(`/buyer/orders/${order.id}`)}>{t('order.cancel.keep')}</Button>
            <p className="pt-1 text-xs text-content-tertiary">{t('order.cancel.undoneNote')}</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ChoiceRow({ active, onClick, title, desc }: { active: boolean; onClick: () => void; title: string; desc: string }) {
  return (
    <label
      onClick={onClick}
      className={cn('flex cursor-pointer gap-3 rounded-xl border p-4', active ? 'border-brand-primary bg-brand-subtle' : 'border-border-subtle')}
    >
      <input type="radio" name="rfq" className="mt-1 h-4 w-4 accent-brand-primary" checked={active} onChange={onClick} />
      <span>
        <span className={cn('block text-sm font-semibold', active ? 'text-brand-primary' : 'text-content-primary')}>{title}</span>
        <span className="mt-0.5 block text-sm text-content-secondary">{desc}</span>
      </span>
    </label>
  )
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-content-tertiary">{label}</dt>
      <dd className={valueClass ?? 'font-medium text-content-primary'}>{value}</dd>
    </div>
  )
}
