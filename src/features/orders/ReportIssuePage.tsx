import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { Textarea } from '@/shared/ui/Textarea'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { cn } from '@/shared/lib/cn'
import { useOrder, useReportIssue } from './hooks/orderQueries'
import { orderTotals } from './lib'

const CATEGORIES = ['wrong_items', 'damaged_goods', 'short_quantity', 'not_as_specified', 'late_delivery', 'other']

export function ReportIssuePage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: order, isLoading } = useOrder(id)
  const report = useReportIssue()

  const [category, setCategory] = useState('')
  const [lines, setLines] = useState<number[]>([])
  const [description, setDescription] = useState('')

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!order) return <Navigate to="/buyer/orders" replace />

  const money = (n: number) => formatSar(toHalalas(n), { locale: i18n.language })
  const dateFull = (iso?: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const canSubmit = category.length > 0 && description.trim().length > 0

  const toggleLine = (i: number) => setLines((ls) => (ls.includes(i) ? ls.filter((x) => x !== i) : [...ls, i]))

  const submit = () =>
    report.mutate(
      {
        id: order.id,
        issue: { category, lineIndexes: lines, description: description.trim(), evidence: [], reportedAt: new Date().toISOString() },
      },
      { onSuccess: () => navigate(`/buyer/orders/${order.id}`) },
    )

  return (
    <section className="mx-auto w-full max-w-6xl motion-safe:animate-card-in">
      <nav className="text-sm text-content-tertiary">
        <button type="button" onClick={() => navigate('/buyer/orders')} className="cursor-pointer hover:text-content-secondary">{t('order.title')}</button>
        <span className="mx-1.5">/</span>
        <button type="button" onClick={() => navigate(`/buyer/orders/${order.id}`)} className="cursor-pointer hover:text-content-secondary">{order.id}</button>
        <span className="mx-1.5">/</span>
        <span className="text-content-secondary">{t('order.report.crumb')}</span>
      </nav>

      <h1 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">{t('order.report.heading')}</h1>
      <p className="mt-1 text-sm text-content-secondary">{order.title} · {order.id} · {order.supplier.name}</p>

      <div className="mt-4 rounded-xl bg-status-info-subtle px-4 py-3 text-sm text-status-info">{t('order.report.banner')}</div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
          <h2 className="text-sm font-semibold text-content-primary">{t('order.report.whatTitle')}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                  category === c ? 'border-brand-primary bg-brand-subtle text-brand-primary' : 'border-border-subtle text-content-secondary hover:text-content-primary',
                )}
              >
                {t(`order.report.category.${c}`)}
              </button>
            ))}
          </div>

          <p className="mt-4 text-sm font-medium text-content-secondary">{t('order.report.whichItems')}</p>
          <ul className="mt-2 space-y-2">
            {order.lines.map((l, i) => {
              const received = order.receipt?.[i]?.received
              const short = received != null && received < l.quantity
              return (
                <li key={i}>
                  <label
                    className={cn(
                      'flex cursor-pointer items-center justify-between gap-3 rounded-lg border px-3 py-2.5 text-sm',
                      lines.includes(i) ? 'border-brand-primary bg-brand-subtle' : short ? 'border-status-warning-subtle bg-status-warning-subtle/40' : 'border-border-subtle',
                    )}
                  >
                    <span className="flex items-center gap-2.5">
                      <input type="checkbox" className="h-4 w-4 accent-brand-primary" checked={lines.includes(i)} onChange={() => toggleLine(i)} />
                      <span className="font-medium text-content-primary">{i + 1} · {l.description}</span>
                    </span>
                    <span className={cn('tabular-nums', short ? 'text-status-warning-strong' : 'text-content-tertiary')}>
                      {short ? t('order.report.receivedOf', { received, total: l.quantity }) : `${l.quantity.toLocaleString(i18n.language)} ${l.unit}`}
                    </span>
                  </label>
                </li>
              )
            })}
          </ul>

          <label className="mt-4 block text-sm font-medium text-content-secondary">{t('order.report.describe')}</label>
          <Textarea rows={3} className="mt-1.5" value={description} onChange={(e) => setDescription(e.target.value)} placeholder={t('order.report.describePlaceholder')} />

          <div className="mt-4 flex items-center justify-between rounded-lg border border-dashed border-border-subtle px-3 py-2.5 text-sm text-content-tertiary">
            <span>{t('order.report.attach')}</span>
            <button type="button" className="cursor-pointer font-medium text-content-link hover:text-content-link-hover">{t('order.report.addMore')}</button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.report.orderTitle')}</h2>
            <dl className="mt-3 space-y-2.5 text-sm">
              <Row label={t('order.col.order')} value={order.id} />
              <Row label={t('order.supplier')} value={order.supplierShort} />
              <Row label={t('order.report.delivered')} value={dateFull(order.shipment.deliveredAt)} />
              <Row label={t('order.po.total')} value={money(orderTotals(order).total)} />
              <Row label={t('order.ship.status')} value={t('order.report.beingReported')} valueClass="font-semibold text-status-warning-strong" />
            </dl>
          </div>

          <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
            <h2 className="text-sm font-semibold text-content-primary">{t('order.report.helpTitle')}</h2>
            <p className="mt-1 text-sm text-content-secondary">{t('order.report.helpBody')}</p>
            <dl className="mt-3 space-y-2 text-sm">
              <Row label={t('order.report.email')} value="support@mimony.sa" />
              <Row label={t('order.report.phone')} value="+966 5X XXX XXXX" />
              <Row label={t('order.report.hours')} value={t('order.report.hoursValue')} />
            </dl>
          </div>

          <div className="space-y-2.5 rounded-xl border border-border-subtle bg-bg-surface p-5">
            <Button fullWidth disabled={!canSubmit} isLoading={report.isPending} onClick={submit}>{t('order.report.submit')}</Button>
            <Button fullWidth variant="outline" onClick={() => navigate(`/buyer/orders/${order.id}`)}>{t('order.report.cancel')}</Button>
            <p className="pt-1 text-xs text-content-tertiary">{t('order.report.replyNote')}</p>
          </div>
        </div>
      </div>
    </section>
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
