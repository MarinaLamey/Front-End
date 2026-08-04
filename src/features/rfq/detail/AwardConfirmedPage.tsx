import { useTranslation } from 'react-i18next'
import { Navigate, useNavigate, useParams } from 'react-router-dom'
import { Button } from '@/shared/ui/Button'
import { Spinner } from '@/shared/ui/Spinner'
import { formatSar, toHalalas } from '@/shared/lib/money'
import { useRfq } from '../hooks/rfqQueries'

export function AwardConfirmedPage() {
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const { id = '' } = useParams()
  const { data: rfq, isLoading } = useRfq(id)

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner />
      </div>
    )
  }
  if (!rfq) return <Navigate to="/buyer/rfqs" replace />
  if (!rfq.award) return <Navigate to={`/buyer/rfqs/${id}`} replace />

  const a = rfq.award
  const dateFull = (iso: string) =>
    iso ? new Intl.DateTimeFormat(i18n.language, { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso)) : '—'
  const steps = t('rfq.award.next.steps', { returnObjects: true }) as { title: string; desc: string }[]

  return (
    <section className="auth-stagger mx-auto w-full max-w-5xl space-y-6">
      {/* Confirmation banner */}
      <div className="rounded-2xl bg-status-success-subtle p-6">
        <div className="flex items-center gap-2 text-sm">
          <span className="rounded-full bg-status-success px-2 py-0.5 text-xs font-semibold text-white">
            {t('rfq.statusLabel.awarded')}
          </span>
          <span className="text-content-secondary">{rfq.reference} · {rfq.title}</span>
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-content-primary">{t('rfq.award.title')}</h1>
        <p className="mt-1 text-sm text-content-secondary">
          {t('rfq.award.subtitle', { version: a.offerVersion })}
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Supplier revealed */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.award.supplierRevealed')}</h2>
            <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand-strong">
              {t('rfq.award.wasSupplier', { label: a.supplierLabel })}
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-content-link">{a.identity.companyName}</p>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label={t('rfq.award.cr')} value={a.identity.cr} />
            <Row label={t('rfq.award.vat')} value={a.identity.vat} />
            <Row label={t('rfq.award.address')} value={a.identity.address} />
            <Row label={t('rfq.award.contact')} value={`${a.identity.contactName} · ${a.identity.contactRole}`} />
            <Row label={t('rfq.award.certs')} value={a.identity.certifications.join(' · ') || '—'} />
          </dl>
          <p className="mt-4 text-xs text-content-tertiary">{t('rfq.award.sharedNote')}</p>
        </div>

        {/* Agreed terms */}
        <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-content-primary">{t('rfq.award.agreedTerms')}</h2>
            <span className="rounded-full bg-brand-subtle px-2 py-0.5 text-xs font-medium text-brand-strong">
              {t('rfq.award.fromOffer', { version: a.offerVersion })}
            </span>
          </div>
          <p className="mt-3 text-lg font-bold text-content-primary">{formatSar(toHalalas(a.agreedTotalSar))}</p>
          <dl className="mt-3 space-y-2.5 text-sm">
            <Row label={t('rfq.award.itemsCovered')} value={t('rfq.detail.itemsOf', { covered: a.itemsCovered, total: a.itemsTotal })} />
            <Row label={t('rfq.award.deliveryDate')} value={dateFull(a.deliveryDate)} />
            <Row label={t('rfq.award.paymentTerms')} value={a.paymentTermsLabel} />
            <Row label={t('rfq.award.negotiationRounds')} value={String(a.negotiationRounds)} />
            <Row
              label={t('rfq.award.savedVsBid')}
              value={formatSar(toHalalas(a.savedVsOriginalSar))}
              valueClass="text-status-success-strong"
            />
          </dl>
          <p className="mt-4 text-xs text-content-tertiary">{t('rfq.award.termsNote')}</p>
        </div>
      </div>

      {/* Unsourced items */}
      {a.unsourcedItems.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-status-warning-subtle px-4 py-3">
          <p className="text-sm text-status-warning-strong">
            {t('rfq.award.unsourced', { items: a.unsourcedItems.join(', ') })}
          </p>
          <Button variant="outline" size="sm" onClick={() => navigate('/buyer/rfqs/new')}>
            {t('rfq.award.resource')}
          </Button>
        </div>
      )}

      {/* What happens next */}
      <div className="rounded-xl border border-border-subtle bg-bg-surface p-5">
        <p className="text-sm font-semibold text-content-primary">{t('rfq.award.next.heading')}</p>
        <ol className="mt-3 grid gap-4 sm:grid-cols-3">
          {steps.map((step, i) => (
            <li key={step.title} className="rounded-xl bg-bg-surface-sunken p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-brand-subtle text-xs font-semibold text-brand-strong">
                  {i + 1}
                </span>
                <p className="text-sm font-medium text-content-primary">{step.title}</p>
              </div>
              <p className="mt-2 text-xs text-content-tertiary">
                {i === 0 ? t('rfq.award.next.poIssued', { po: a.poNumber }) : step.desc}
              </p>
            </li>
          ))}
        </ol>
      </div>

      <div className="flex items-center gap-3">
        <Button onClick={() => navigate(`/buyer/orders/${id}`)}>{t('rfq.award.viewOrder')}</Button>
        <Button variant="outline" onClick={() => navigate('/buyer/rfqs')}>{t('rfq.award.backToRfqs')}</Button>
      </div>
    </section>
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
